'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, Plus, Minus } from "lucide-react"

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase, useUser, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction } from "firebase/firestore"
import React, { useMemo, useState, useEffect } from "react"
import { Separator } from "@/components/ui/separator"

const passengerSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  birthDate: z.string().optional(),
});

const fareBreakdownSchema = z.object({
  passengerType: z.string(),
  count: z.coerce.number().int().min(0),
});

const bookingFormSchema = z.object({
  routeId: z.string({ required_error: "Please select a route." }),
  travelDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A date of travel is required."}),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  fareBreakdown: z.array(fareBreakdownSchema),
  primaryEmail: z.string().email({ message: "Please enter a valid email address." }),
  primaryPhone: z.string().min(1, { message: "Please enter a contact number." }),
});

export default function BookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresQuery = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<any[]>([]);

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: new Date().toISOString().split("T")[0],
      scheduleId: "",
      passengers: [{ fullName: "", birthDate: "" }],
      fareBreakdown: [],
      primaryEmail: "",
      primaryPhone: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  
  const { fields: fareFields, replace: replaceFareFields } = useFieldArray({
    control: form.control,
    name: "fareBreakdown",
  });

  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');
  const watchFareBreakdown = form.watch('fareBreakdown');

  // Filter schedules based on route and date
  useEffect(() => {
    if (watchRouteId && allSchedules) {
      const relatedSchedules = allSchedules.filter(s => s.routeId === watchRouteId && s.availableSeats > 0);
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
      
      const passengerTypes = route?.passengerTypes || [];
      const newFareBreakdown = passengerTypes.map(type => ({
        passengerType: type,
        count: 0
      }));
      replaceFareFields(newFareBreakdown);
      
      setAvailableFares(routeFares);
    } else {
      replaceFareFields([]);
      setAvailableFares([]);
    }
  }, [watchScheduleId, allSchedules, routes, allFares, replaceFareFields]);
  
  const totalSeats = useMemo(() => {
    return watchFareBreakdown.reduce((acc, current) => acc + current.count, 0);
  }, [watchFareBreakdown]);

  useEffect(() => {
    const numPassengers = watchPassengers.length;
    if (totalSeats > 0 && totalSeats !== numPassengers) {
       form.setError("fareBreakdown", { type: "manual", message: `The number of tickets (${totalSeats}) must match the number of passengers (${numPassengers}).` });
    }
    else {
      form.clearErrors("fareBreakdown");
    }
  }, [totalSeats, watchPassengers, form]);


  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  async function onSubmit(data: z.infer<typeof bookingFormSchema>) {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect. Please try again later.' });
      return;
    }
    if (totalSeats === 0) {
      form.setError("fareBreakdown", { type: "manual", message: "You must select at least one ticket." });
      return;
    }
    if (totalSeats !== data.passengers.length) {
       form.setError("fareBreakdown", { type: "manual", message: "The number of tickets must match the number of passengers." });
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
        
        const totalPrice = data.fareBreakdown.reduce((acc, item) => {
          const fareInfo = availableFares.find(f => f.passengerType === item.passengerType);
          return acc + (fareInfo?.price || 0) * item.count;
        }, 0);

        transaction.update(scheduleRef, { availableSeats: newAvailableSeats });
        
        const bookingData = {
          id: newBookingRef.id,
          passengerId: user.uid,
          passengerInfo: data.passengers,
          passengerEmail: data.primaryEmail,
          passengerPhone: data.primaryPhone,
          scheduleId,
          fareDetails: data.fareBreakdown
            .filter(item => item.count > 0)
            .map(item => {
                const fareInfo = availableFares.find(f => f.passengerType === item.passengerType);
                return {
                    ...item,
                    fareId: fareInfo?.id,
                    pricePerTicket: fareInfo?.price
                };
            }),
          bookingDate: serverTimestamp(),
          travelDate: new Date(data.travelDate),
          numberOfSeats: totalSeats,
          totalPrice,
          routeName: getRouteName(scheduleData.routeId),
        };

        transaction.set(newBookingRef, bookingData);
      });

      toast({
        title: "Booking Successful!",
        description: `Your booking for ${totalSeats} passenger(s) has been confirmed.`,
      });
      form.reset();

    } catch (e: any) {
      const isPermissionError = e.message.includes('permission-denied') || e.code === 'permission-denied';
      const permissionError = isPermissionError ? new FirestorePermissionError({
          path: newBookingRef.path,
          operation: 'create',
          requestResourceData: { ...data, passengerId: user.uid, numberOfSeats: totalSeats },
      }) : null;

      if(permissionError){
        errorEmitter.emit('permission-error', permissionError);
      }
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: isPermissionError ? "You do not have permission to perform this action." : (e.message || "Could not complete your booking."),
      });
    }
  }

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">Book Your Seat Online</CardTitle>
              <CardDescription>Fill in the details below to complete your reservation.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading booking information...</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
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
                             {(!filteredSchedules || filteredSchedules.length === 0) && watchRouteId && (
                                <p className="text-sm text-muted-foreground pt-1">No available trips for the selected route and date.</p>
                            )}
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-end">
                          <FormField
                            control={form.control}
                            name={`passengers.${index}.fullName`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-4">
                                <FormLabel>Passenger {index + 1} Full Name</FormLabel>
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
                                  <Input type="date" placeholder="YYYY-MM-DD" {...field} />
                                </FormControl>
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
                        onClick={() => append({ fullName: "", birthDate: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Another Passenger
                      </Button>
                    </div>
                    
                    {watchScheduleId && availableFares.length > 0 && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-medium">Tickets</h3>
                            <div className="space-y-4">
                            {fareFields.map((field, index) => {
                                const fareInfo = availableFares.find(f => f.passengerType === field.passengerType);
                                const currentCount = form.getValues(`fareBreakdown.${index}.count`);
                                return (
                                <div key={field.id} className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{field.passengerType}</p>
                                    <p className="text-sm text-muted-foreground">₱{fareInfo?.price.toFixed(2) || '0.00'}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => form.setValue(`fareBreakdown.${index}.count`, Math.max(0, currentCount - 1))}
                                      disabled={currentCount <= 0}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-10 text-center font-medium">{currentCount}</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => form.setValue(`fareBreakdown.${index}.count`, currentCount + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                            <FormMessage>{form.formState.errors.fareBreakdown?.message}</FormMessage>
                        </div>
                    )}

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
                    
                    {totalSeats > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span>Route</span>
                                    <span className="font-medium">{getRouteName(watchRouteId)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Total Tickets</span>
                                    <span className="font-medium">{totalSeats}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Total Price</span>
                                    <span>₱{
                                        form.getValues('fareBreakdown').reduce((acc, item) => {
                                            const fareInfo = availableFares.find(f => f.passengerType === item.passengerType);
                                            return acc + (fareInfo?.price || 0) * item.count;
                                        }, 0).toFixed(2)
                                    }</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}


                    <Button type="submit" size="lg" className="w-full" disabled={!form.formState.isValid || totalSeats === 0 || totalSeats !== watchPassengers.length}>
                      Confirm Booking
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
