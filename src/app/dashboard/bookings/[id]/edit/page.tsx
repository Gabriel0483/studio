'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from '@/firebase';
import { collection, doc, serverTimestamp, runTransaction, Timestamp, updateDoc } from 'firebase/firestore';
import React, { useMemo, useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';

const passengerSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: 'Full name must be at least 2 characters.' }),
  birthDate: z.string().optional(),
  fareType: z.string({ required_error: 'Please select a fare type.' }),
});

const bookingFormSchema = z.object({
  routeId: z.string({ required_error: 'Please select a route.' }),
  travelDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'A date of travel is required.',
  }),
  scheduleId: z.string({ required_error: 'Please select a schedule.' }),
  passengers: z.array(passengerSchema).min(1, 'At least one passenger is required.'),
  primaryEmail: z
    .string()
    .email({ message: 'Please enter a valid email address.' }),
  primaryPhone: z.string().min(1, { message: 'Please enter a contact number.' }),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function EditBookingPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const router = useRouter();

  const bookingRef = useMemoFirebase(
    () => (firestore && params.id ? doc(firestore, 'bookings', params.id) : null),
    [firestore, params.id]
  );
  const { data: booking, isLoading: isLoadingBooking } = useDoc(bookingRef);

  const schedulesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schedules') : null),
    [firestore]
  );
  const routesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'routes') : null),
    [firestore]
  );
  const faresQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'fares') : null),
    [firestore]
  );

  const { data: allSchedules, isLoading: isLoadingSchedules } =
    useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<any[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  useEffect(() => {
    if (booking) {
      const travelDate =
        booking.travelDate instanceof Timestamp
          ? booking.travelDate.toDate()
          : new Date(booking.travelDate);
          
      form.reset({
        routeId: allSchedules?.find(s => s.id === booking.scheduleId)?.routeId || '',
        travelDate: format(travelDate, 'yyyy-MM-dd'),
        scheduleId: booking.scheduleId,
        passengers: booking.passengerInfo.map((p: any) => ({
          fullName: p.fullName,
          birthDate: p.birthDate || '',
          fareType: p.fareType,
        })),
        primaryEmail: booking.passengerEmail,
        primaryPhone: booking.passengerPhone,
      });
    }
  }, [booking, form, allSchedules]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'passengers',
  });

  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');

  // Filter schedules based on route and date
  useEffect(() => {
    if (watchRouteId && watchTravelDate && allSchedules) {
      const relatedSchedules = allSchedules.filter(
        (s) =>
          s.routeId === watchRouteId &&
          (s.tripType === 'Daily' || s.date === watchTravelDate)
      );
      setFilteredSchedules(relatedSchedules);
    } else {
      setFilteredSchedules([]);
    }
  }, [watchRouteId, watchTravelDate, allSchedules, form]);

  // Update fares when schedule changes
  useEffect(() => {
    const selectedSchedule = allSchedules?.find((s) => s.id === watchScheduleId);
    if (selectedSchedule && routes && allFares) {
      const route = routes.find((r) => r.id === selectedSchedule.routeId);
      const routeFares = allFares.filter((f) => f.routeId === route?.id);
      setAvailableFares(routeFares);
    } else {
      setAvailableFares([]);
    }
  }, [watchScheduleId, allSchedules, routes, allFares]);

  const bookingSummary = useMemo(() => {
    const fareDetails = watchPassengers
      .map((passenger) => {
        if (!passenger.fareType) return null;
        const fareInfo = availableFares.find(
          (f) => f.passengerType === passenger.fareType
        );
        return {
          name: passenger.fullName || 'Passenger',
          fareType: passenger.fareType,
          price: fareInfo?.price || 0,
        };
      })
      .filter(
        (item): item is { name: string; fareType: string; price: number } =>
          item !== null
      );

    const totalPrice = fareDetails.reduce(
      (acc, detail) => acc + (detail?.price || 0),
      0
    );

    return {
      details: fareDetails,
      totalPrice,
      totalTickets: watchPassengers.length,
    };
  }, [watchPassengers, availableFares]);


  const getRouteName = (routeId: string) =>
    routes?.find((r) => r.id === routeId)?.name || 'Unknown Route';

  async function handleUpdateBooking(data: BookingFormData) {
    if (!firestore || !booking) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect. Please try again later.',
      });
      return;
    }
    
    // Logic to calculate seat difference
    const originalSeats = booking.numberOfSeats;
    const newSeats = data.passengers.length;
    const seatDifference = newSeats - originalSeats;

    try {
        await runTransaction(firestore, async (transaction) => {
            const scheduleRef = doc(firestore, 'schedules', data.scheduleId);
            const scheduleDoc = await transaction.get(scheduleRef);

            if (!scheduleDoc.exists()) throw new Error("Schedule does not exist!");
            
            const scheduleData = scheduleDoc.data();
            const newAvailableSeats = scheduleData.availableSeats - seatDifference;
            if (newAvailableSeats < 0) throw new Error("Not enough seats available for this change.");

            transaction.update(scheduleRef, { availableSeats: newAvailableSeats });

            const bookingUpdateData = {
                passengerInfo: data.passengers.map((p) => ({
                    fullName: p.fullName,
                    birthDate: p.birthDate || null,
                    fareType: p.fareType,
                })),
                passengerEmail: data.primaryEmail,
                passengerPhone: data.primaryPhone,
                scheduleId: data.scheduleId,
                fareDetails: data.passengers.map((p) => {
                    const fareInfo = availableFares.find(f => f.passengerType === p.fareType);
                    return {
                        fareId: fareInfo?.id || null,
                        passengerType: p.fareType,
                        count: 1,
                        pricePerTicket: fareInfo?.price || 0
                    }
                }),
                travelDate: new Date(data.travelDate),
                numberOfSeats: newSeats,
                totalPrice: bookingSummary.totalPrice,
                routeName: getRouteName(scheduleData.routeId),
            };
            
            transaction.update(bookingRef, bookingUpdateData);
        });

      toast({
        title: 'Booking Updated!',
        description: 'The booking has been successfully updated.',
      });
      router.push('/dashboard/bookings');
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'Could not update the booking.',
      });
    }
  }

  const isLoading =
    isLoadingSchedules || isLoadingRoutes || isLoadingFares || isLoadingBooking;
    
  if (isLoading) {
    return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Loading booking details...</p>
        </div>
    )
  }
  
  if (!booking) {
     return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <p>Booking not found.</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
           <Button variant="ghost" size="sm" className="w-fit p-0 h-auto mb-2" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
            </Button>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Edit Booking
          </CardTitle>
          <CardDescription>
            Modify the booking details below and save your changes.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdateBooking)}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Route</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a route" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {routes?.map((route) => (
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
                        <Input
                          type="date"
                          {...field}
                          min={new Date().toISOString().split('T')[0]}
                        />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!watchRouteId || !watchTravelDate}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredSchedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            {schedule.departureTime} - {schedule.arrivalTime} (
                            {schedule.availableSeats} seats left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!filteredSchedules || filteredSchedules.length === 0) &&
                      watchRouteId &&
                      watchTravelDate && (
                        <p className="text-sm text-muted-foreground pt-1">
                          No available trips for the selected route and date.
                        </p>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-6">
                <h3 className="font-medium text-lg border-b pb-2">
                  Passenger Details
                </h3>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 sm:grid-cols-8 gap-4 items-end p-4 border rounded-lg relative"
                  >
                    <div className="sm:col-span-8">
                      <p className="font-semibold text-md">
                        Passenger {index + 1}
                      </p>
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
                            <Input
                              type="date"
                              {...field}
                              placeholder="YYYY-MM-DD"
                            />
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!watchScheduleId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fare" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableFares.map((fare) => (
                                <SelectItem
                                  key={fare.id}
                                  value={fare.passengerType}
                                >
                                  {fare.passengerType} (₱
                                  {fare.price.toFixed(2)})
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
                  onClick={() => append({ fullName: '', birthDate: '', fareType: '' })}
                  disabled={!watchScheduleId}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another
                  Passenger
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

                <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Booking Summary</h3>
                     {bookingSummary.details.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm pb-2">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-muted-foreground">{item.fareType}</p>
                            </div>
                            <span className="font-medium">₱{item.price.toFixed(2)}</span>
                        </div>
                    ))}
                  </div>

                <Separator />

                <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total Price</span>
                    <span>₱{bookingSummary.totalPrice.toFixed(2)}</span>
                </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!form.formState.isValid || watchPassengers.length === 0}
              >
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
