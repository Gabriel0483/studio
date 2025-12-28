'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction, Timestamp } from "firebase/firestore"
import React, { useMemo, useState, useEffect } from "react"
import { Separator } from "@/components/ui/separator"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { format } from "date-fns"

const passengerSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  birthDate: z.string().optional(),
  fareType: z.string({ required_error: "Please select a fare type."}),
});

const bookingFormSchema = z.object({
  routeId: z.string({ required_error: "Please select a route." }),
  travelDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A date of travel is required."}),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  primaryEmail: z.string().email({ message: "Please enter a valid email address." }),
  primaryPhone: z.string().min(1, { message: "Please enter a contact number." }),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function BookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [step, setStep] = useState<'form' | 'summary'>('form');

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresQuery = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<any[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: new Date().toISOString().split("T")[0],
      scheduleId: "",
      passengers: [{ fullName: "", birthDate: "", fareType: "" }],
      primaryEmail: user?.email || "",
      primaryPhone: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  
  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');

  // Filter schedules based on route and date
  useEffect(() => {
    if (watchRouteId && watchTravelDate && allSchedules) {
      const relatedSchedules = allSchedules.filter(s => 
        s.routeId === watchRouteId && 
        (s.tripType === 'Daily' || s.date === watchTravelDate) &&
        s.availableSeats > 0
      );
      setFilteredSchedules(relatedSchedules);
      form.resetField('scheduleId');
    } else {
      setFilteredSchedules([]);
    }
  }, [watchRouteId, watchTravelDate, allSchedules, form]);
  
  // Update fares when schedule changes
  useEffect(() => {
    const selectedSchedule = allSchedules?.find(s => s.id === watchScheduleId);
    if (selectedSchedule && routes && allFares) {
      const route = routes.find(r => r.id === selectedSchedule.routeId);
      const routeFares = allFares.filter(f => f.routeId === route?.id);
      setAvailableFares(routeFares);
    } else {
      setAvailableFares([]);
    }
  }, [watchScheduleId, allSchedules, routes, allFares]);

  const totalSeats = watchPassengers.length;
  
  const bookingSummary = useMemo(() => {
    const fareDetails = watchPassengers
      .map(passenger => {
        if (!passenger.fareType) return null;
        const fareInfo = availableFares.find(f => f.passengerType === passenger.fareType);
        return {
          name: passenger.fullName || 'Passenger',
          fareType: passenger.fareType,
          price: fareInfo?.price || 0,
        };
      })
      .filter(Boolean);

    const totalPrice = fareDetails.reduce((acc, detail) => acc + (detail?.price || 0), 0);
    
    return {
      details: fareDetails,
      totalPrice,
      totalTickets: watchPassengers.length,
    };
  }, [watchPassengers, availableFares]);


  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';
  
  const handleFormSubmit = (data: BookingFormData) => {
    // On first step submit, just validate and move to summary
    setStep('summary');
  };

  async function handleFinalReserve(data: BookingFormData) {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect. Please try again later.' });
      return;
    }

    const { scheduleId } = data;
    const scheduleRef = doc(firestore, 'schedules', scheduleId);
    const newBookingRef = doc(collection(firestore, 'bookings'));

    try {
      await runTransaction(firestore, async (transaction) => {
        const scheduleDoc = await transaction.get(scheduleRef);
        if (!scheduleDoc.exists()) throw new Error("Schedule does not exist!");

        const scheduleData = scheduleDoc.data();
        const newAvailableSeats = scheduleData.availableSeats - totalSeats;
        if (newAvailableSeats < 0) throw new Error("Not enough seats available.");
        
        transaction.update(scheduleRef, { availableSeats: newAvailableSeats });
        
        const bookingData = {
          id: newBookingRef.id,
          passengerId: user.uid,
          passengerInfo: data.passengers.map(p => ({
            fullName: p.fullName,
            birthDate: p.birthDate || null,
            fareType: p.fareType,
          })),
          passengerEmail: data.primaryEmail,
          passengerPhone: data.primaryPhone,
          scheduleId,
          fareDetails: data.passengers.map(p => {
            const fareInfo = availableFares.find(f => f.passengerType === p.fareType);
            return {
              fareId: fareInfo?.id || null,
              passengerType: p.fareType,
              count: 1,
              pricePerTicket: fareInfo?.price || 0
            }
          }),
          bookingDate: serverTimestamp(),
          travelDate: new Date(data.travelDate),
          numberOfSeats: totalSeats,
          totalPrice: bookingSummary.totalPrice,
          routeName: getRouteName(scheduleData.routeId),
        };

        transaction.set(newBookingRef, bookingData);
      });

      // Also create/update passenger profile non-blockingly
      const passengerRef = doc(firestore, 'passengers', user.uid);
      const passengerData = {
          id: user.uid,
          firstName: data.passengers[0].fullName.split(' ')[0],
          lastName: data.passengers[0].fullName.split(' ').slice(1).join(' '),
          email: data.primaryEmail,
          phone: data.primaryPhone,
          address: '', // Address not collected in this form
      };
      setDocumentNonBlocking(passengerRef, passengerData, { merge: true });

      toast({
        title: "Booking Successful!",
        description: `Your booking for ${totalSeats} passenger(s) has been confirmed.`,
      });
      form.reset();
      setStep('form');

    } catch (e: any) {
      console.error(e); // Keep detailed log for debugging
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: e.message || "Could not complete your booking.",
      });
    }
  }

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares;

  const currentSchedule = filteredSchedules.find(s => s.id === watchScheduleId);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">Book Your Seat Online</CardTitle>
              <CardDescription>
                {step === 'form' 
                  ? "Fill in the details below to complete your reservation."
                  : "Please review your booking details before confirming."
                }
              </CardDescription>
            </CardHeader>
            
            {step === 'form' && (
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Loading booking information...</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                      
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <FormField
                              control={form.control}
                              name="routeId"
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Route</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                      <SelectTrigger>
                                      <SelectValue placeholder="Select a route" />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {routes?.map(route => (
                                          <SelectItem key={route.id} value={route.id}>
                                              {route.name}
                                          </SelectItem>
                                      ))}
                                  </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="travelDate"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Date of Travel</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>
                      <FormField
                          control={form.control}
                          name="scheduleId"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Available Trips</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchRouteId || !watchTravelDate}>
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="Select a time" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {filteredSchedules.map(schedule => (
                                      <SelectItem key={schedule.id} value={schedule.id}>
                                          {schedule.departureTime} - {schedule.arrivalTime} ({schedule.availableSeats} seats left)
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                              </Select>
                              {(!filteredSchedules || filteredSchedules.length === 0) && watchRouteId && watchTravelDate && (
                                  <p className="text-sm text-muted-foreground pt-1">No available trips for the selected route and date.</p>
                              )}
                              <FormMessage />
                          </FormItem>
                          )}
                      />

                      <div className="space-y-6">
                        <h3 className="font-medium text-lg border-b pb-2">Passenger Details</h3>
                        {fields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 sm:grid-cols-8 gap-4 items-end p-4 border rounded-lg relative">
                            <div className="sm:col-span-8">
                              <p className="font-semibold text-md">Passenger {index + 1}</p>
                            </div>
                            <FormField
                              control={form.control}
                              name={`passengers.${index}.fullName`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-3">
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`passengers.${index}.birthDate`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Birth Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`passengers.${index}.fareType`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Fare Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchScheduleId}>
                                      <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select fare" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          {availableFares.map(fare => (
                                              <SelectItem key={fare.id} value={fare.passengerType}>
                                                  {fare.passengerType} (₱{fare.price.toFixed(2)})
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="sm:col-span-1">
                              {index > 0 && (
                                  <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => remove(index)}
                                      className="w-full"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ fullName: "", birthDate: "", fareType: "" })}
                          disabled={!watchScheduleId}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Passenger
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <FormField
                              control={form.control}
                              name="primaryPhone"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Contact Number</FormLabel>
                                  <FormControl>
                                      <Input placeholder="e.g., 09171234567" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="primaryEmail"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Contact Email Address</FormLabel>
                                  <FormControl>
                                      <Input placeholder="you@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>
                      
                      <Button type="submit" size="lg" className="w-full" disabled={!form.formState.isValid || totalSeats === 0}>
                        Review Booking
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            )}
            
            {step === 'summary' && (
              <>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Trip Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Route</p>
                        <p className="font-medium">{getRouteName(watchRouteId)}</p>
                      </div>
                       <div>
                        <p className="text-muted-foreground">Date & Time</p>
                        <p className="font-medium">
                          {format(new Date(watchTravelDate), 'PPP')} at {currentSchedule?.departureTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Passenger & Fare Breakdown</h3>
                     {bookingSummary.details.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm pb-2">
                            <div>
                                <p className="font-medium">{item?.name}</p>
                                <p className="text-muted-foreground">{item?.fareType}</p>
                            </div>
                            <span className="font-medium">₱{item?.price.toFixed(2)}</span>
                        </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total Price</span>
                      <span>₱{bookingSummary.totalPrice.toFixed(2)}</span>
                  </div>
                   <div className="text-sm text-muted-foreground">
                      Contact: {form.getValues('primaryEmail')} | {form.getValues('primaryPhone')}
                    </div>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setStep('form')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                    <Button onClick={() => handleFinalReserve(form.getValues())} size="lg" className="w-full sm:w-auto flex-1">
                        Reserve Now
                    </Button>
                </CardFooter>
              </>
            )}

          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
