'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, User, PlusCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"

const passengerSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  birthDate: z.string().optional(),
});

const fareBreakdownSchema = z.object({
  passengerType: z.string(),
  count: z.coerce.number().int().min(0),
});

const bookingFormSchema = z.object({
  primaryEmail: z.string().email({ message: "Please enter a valid email address." }),
  travelDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A date of travel is required."}),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  fareBreakdown: z.array(fareBreakdownSchema),
});

export default function BookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresQuery = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: fares, isLoading: isLoadingFares } = useCollection(faresQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      primaryEmail: "",
      travelDate: new Date().toISOString().split("T")[0],
      passengers: [{ fullName: "", birthDate: "" }],
      fareBreakdown: [],
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

  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');
  const watchTravelDate = form.watch('travelDate');

  useEffect(() => {
    const selectedSchedule = schedules?.find(s => s.id === watchScheduleId);
    if (selectedSchedule && routes && fares) {
      const route = routes.find(r => r.id === selectedSchedule.routeId);
      const routeFares = fares.filter(f => f.routeId === route?.id);
      
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
  }, [watchScheduleId, schedules, routes, fares, replaceFareFields]);
  
  const totalSeats = useMemo(() => {
    return form.getValues('fareBreakdown').reduce((acc, current) => acc + current.count, 0);
  }, [form.watch('fareBreakdown')]);

  useEffect(() => {
    const numPassengers = watchPassengers.length;
    if (totalSeats > numPassengers) {
       form.setError("fareBreakdown", { type: "manual", message: `You have selected ${totalSeats} tickets but only provided ${numPassengers} passenger names.` });
    } else if (totalSeats < numPassengers) {
        form.setError("fareBreakdown", { type: "manual", message: `You have provided ${numPassengers} passenger names but only selected ${totalSeats} tickets.` });
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
          passengerId: user.uid, // Associates booking with anonymous user
          passengerInfo: data.passengers, // Array of passengers
          passengerEmail: data.primaryEmail,
          scheduleId,
          // Storing fare details directly for historical accuracy
          fareDetails: data.fareBreakdown
            .filter(item => item.count > 0)
            .map(item => ({...item, fareId: availableFares.find(f => f.passengerType === item.passengerType)?.id })),
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
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                        <FormField
                            control={form.control}
                            name="scheduleId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Route & Schedule</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchTravelDate}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a destination and time" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {schedules && schedules.filter(s => s.availableSeats > 0).map(schedule => (
                                        <SelectItem key={schedule.id} value={schedule.id}>
                                        {getRouteName(schedule.routeId)} @ {schedule.departureTime}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    {watchScheduleId && availableFares.length > 0 && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-medium">Tickets</h3>
                            <div className="grid grid-cols-2 gap-4">
                            {fareFields.map((field, index) => (
                                <FormField
                                    key={field.id}
                                    control={form.control}
                                    name={`fareBreakdown.${index}.count`}
                                    render={({ field: fieldProps }) => {
                                        const fareInfo = availableFares.find(f => f.passengerType === field.passengerType);
                                        return (
                                            <FormItem>
                                                <FormLabel>{field.passengerType} (₱{fareInfo?.price.toFixed(2) || '0.00'})</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" {...fieldProps} onChange={e => fieldProps.onChange(parseInt(e.target.value, 10) || 0)} />
                                                </FormControl>
                                            </FormItem>
                                        );
                                    }}
                                />
                            ))}
                            </div>
                            <FormMessage>{form.formState.errors.fareBreakdown?.message}</FormMessage>
                        </div>
                    )}


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
                                  <Input type="date" {...field} />
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
