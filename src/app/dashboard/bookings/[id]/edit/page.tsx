
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
} from '@/components/ui/card';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, runTransaction, Timestamp, query, where, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';
import React, { useMemo, useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
  paymentStatus: z.string(),
  noShowFee: z.number().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function EditBookingPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rebookingFee, setRebookingFee] = useState(0);
  const [rebookingReason, setRebookingReason] = useState('');


  const schedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'schedules') : null), [firestore]);
  const routesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'routes') : null), [firestore]);
  const faresQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'fares') : null), [firestore]);
  const shipsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'ships') : null), [firestore]);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);
  const { data: allShips, isLoading: isLoadingShips } = useCollection(shipsQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<any[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  useEffect(() => {
    async function fetchBooking() {
      if (!firestore || !bookingId) return;
      setIsLoadingBooking(true);
      const bookingsRef = collection(firestore, 'bookings');
      const q = query(bookingsRef, where('id', '==', bookingId));
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const bookingDoc = querySnapshot.docs[0];
          const bookingData = { ...bookingDoc.data(), firestoreId: bookingDoc.id };
          setBooking(bookingData);
          
          const bookingScheduleRef = doc(firestore, 'schedules', bookingData.scheduleId);
          const bookingScheduleSnap = await getDoc(bookingScheduleRef);
          const bookingScheduleData = bookingScheduleSnap.data();

          const travelDate =
            bookingData.travelDate instanceof Timestamp
              ? bookingData.travelDate.toDate()
              : new Date(bookingData.travelDate);
          
          form.reset({
            routeId: bookingScheduleData?.routeId || '',
            travelDate: format(travelDate, 'yyyy-MM-dd'),
            scheduleId: bookingData.scheduleId,
            passengers: bookingData.passengerInfo.map((p: any) => ({
              fullName: p.fullName,
              birthDate: p.birthDate ? format(new Date(p.birthDate), 'yyyy-MM-dd') : '',
              fareType: p.fareType,
            })),
            primaryEmail: bookingData.passengerEmail,
            primaryPhone: bookingData.passengerPhone,
            paymentStatus: bookingData.paymentStatus || 'Unpaid',
            noShowFee: bookingData.noShowFee || 0,
          });

        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Booking not found.' });
        }
      } catch (error) {
        console.error("Error fetching booking: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch booking details.' });
      } finally {
        setIsLoadingBooking(false);
      }
    }
    if(firestore && bookingId) {
        fetchBooking();
    }
  }, [firestore, bookingId, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'passengers',
  });

  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');
  const watchNoShowFee = form.watch('noShowFee');

  useEffect(() => {
    if (watchRouteId && watchTravelDate && allSchedules) {
      const formattedTravelDate = format(new Date(watchTravelDate), 'yyyy-MM-dd');
      
      const relatedSchedules = allSchedules.filter(
        (s) =>
          s.routeId === watchRouteId &&
          (s.date === formattedTravelDate || (s.tripType === 'Daily' && !s.date))
      );
      setFilteredSchedules(relatedSchedules);
    } else {
      setFilteredSchedules([]);
    }
  }, [watchRouteId, watchTravelDate, allSchedules]);

  useEffect(() => {
    if (watchScheduleId && allSchedules && routes && allFares) {
      const selectedSchedule = allSchedules.find((s) => s.id === watchScheduleId);
      const route = routes.find((r) => r.id === selectedSchedule?.routeId);
      const routeFares = allFares.filter((f) => f.routeId === route?.id);
      setAvailableFares(routeFares);
    } else {
      setAvailableFares([]);
    }
  }, [watchScheduleId, allSchedules, routes, allFares]);

  const bookingSummary = useMemo(() => {
    if (!watchPassengers) {
      return { details: [], totalPrice: 0, totalTickets: 0 };
    }

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

    const basePrice = fareDetails.reduce(
      (acc, detail) => acc + (detail?.price || 0),
      0
    );
    
    const historicalRebookingFees = booking?.rebookingHistory?.reduce((acc: number, item: any) => acc + item.fee, 0) || 0;
    const noShowFee = watchNoShowFee || 0;
    const currentRebookingFee = rebookingFee || 0;
    const totalFees = historicalRebookingFees + currentRebookingFee + noShowFee;
    const totalPrice = basePrice + totalFees;

    return {
      details: fareDetails,
      basePrice,
      historicalRebookingFees,
      currentRebookingFee,
      noShowFee,
      totalPrice,
      totalTickets: watchPassengers.length,
    };
  }, [watchPassengers, availableFares, booking, rebookingFee, watchNoShowFee]);


  const getRouteName = (routeId: string) =>
    routes?.find((r) => r.id === routeId)?.name || 'Unknown Route';

  async function handleUpdateBooking(data: BookingFormData) {
    if (!firestore || !booking || !allSchedules || !allShips) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect. Please try again.' });
      return;
    }
    setIsSubmitting(true);
    
    const newSeats = data.passengers.length;

    try {
        await runTransaction(firestore, async (transaction) => {
            const bookingRef = doc(firestore, 'bookings', booking.firestoreId);
            const oldScheduleRef = doc(firestore, 'schedules', booking.scheduleId);
            
            // --- RESTORE OLD SEATS ---
            const oldScheduleDoc = await transaction.get(oldScheduleRef);
            if (oldScheduleDoc.exists() && (booking.status === 'Reserved' || booking.status === 'Confirmed')) {
                transaction.update(oldScheduleRef, { availableSeats: oldScheduleDoc.data().availableSeats + booking.numberOfSeats });
            }

            // --- FIND OR CREATE NEW SCHEDULE INSTANCE ---
            const newTemplateScheduleRef = doc(firestore, 'schedules', data.scheduleId);
            const newTemplateScheduleDoc = await transaction.get(newTemplateScheduleRef);
            if (!newTemplateScheduleDoc.exists()) throw new Error("New schedule template does not exist!");

            const newTemplateScheduleData = newTemplateScheduleDoc.data();
            let finalScheduleRef: any;
            let finalScheduleId: string;

            const isFutureDailyTrip = newTemplateScheduleData.tripType === 'Daily' && !newTemplateScheduleData.date && format(new Date(data.travelDate), 'yyyy-MM-dd') > format(new Date(), 'yyyy-MM-dd');
            
            if (isFutureDailyTrip) {
                const schedulesCol = collection(firestore, 'schedules');
                const q = query(schedulesCol, where("baseScheduleId", "==", data.scheduleId), where("date", "==", format(new Date(data.travelDate), 'yyyy-MM-dd')));
                const existingInstances = await getDocs(q);

                if (!existingInstances.empty) {
                    finalScheduleRef = existingInstances.docs[0].ref;
                } else {
                    const ship = allShips.find(ship => ship.id === newTemplateScheduleData.shipId);
                    if (!ship) throw new Error("Assigned ship not found for new schedule.");

                    finalScheduleRef = doc(collection(firestore, 'schedules'));
                    transaction.set(finalScheduleRef, {
                        ...newTemplateScheduleData,
                        tripType: 'Special',
                        date: format(new Date(data.travelDate), 'yyyy-MM-dd'),
                        availableSeats: ship.capacity,
                        baseScheduleId: data.scheduleId,
                        status: 'On Time',
                    });
                }
            } else {
                finalScheduleRef = newTemplateScheduleRef;
            }

            finalScheduleId = finalScheduleRef.id;

            // --- DEDUCT SEATS FROM NEW SCHEDULE & UPDATE BOOKING ---
            const newScheduleDoc = await transaction.get(finalScheduleRef);
            if (!newScheduleDoc.exists()) throw new Error("New schedule could not be found or created.");
            
            const newScheduleData = newScheduleDoc.data();
            let newStatus = booking.status;
            let currentAvailableSeats = newScheduleData.availableSeats;

            if (currentAvailableSeats >= newSeats) {
                transaction.update(finalScheduleRef, { availableSeats: currentAvailableSeats - newSeats });
                newStatus = (data.paymentStatus === 'Paid' || booking.paymentStatus === 'Paid') ? 'Confirmed' : 'Reserved';
            } else {
                newStatus = 'Waitlisted';
            }
            
            const fareDetails = data.passengers.map((p) => {
                const fareInfo = availableFares.find(f => f.passengerType === p.fareType);
                return { fareId: fareInfo?.id || null, passengerType: p.fareType, count: 1, pricePerTicket: fareInfo?.price || 0 };
            });
            
            const newRebookingHistory = [...(booking.rebookingHistory || [])];
            if (rebookingFee > 0) {
                newRebookingHistory.push({ fee: rebookingFee, date: new Date().toISOString(), reason: rebookingReason || 'Rebooking Fee' });
            }

            transaction.update(bookingRef, {
                passengerInfo: data.passengers.map((p) => ({ fullName: p.fullName, birthDate: p.birthDate || null, fareType: p.fareType })),
                passengerEmail: data.primaryEmail,
                passengerPhone: data.primaryPhone,
                scheduleId: finalScheduleId,
                fareDetails,
                travelDate: new Date(data.travelDate),
                numberOfSeats: newSeats,
                totalPrice: bookingSummary.totalPrice,
                routeName: getRouteName(newScheduleData.routeId),
                status: newStatus,
                paymentStatus: data.paymentStatus,
                rebookingHistory: newRebookingHistory,
                noShowFee: data.noShowFee > 0 ? data.noShowFee : null,
            });
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
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading =
    isLoadingSchedules || isLoadingRoutes || isLoadingFares || isLoadingBooking || isLoadingShips;
    
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
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
           <Button variant="ghost" size="sm" className="w-fit p-0 h-auto mb-2" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
            </Button>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Edit Booking #{booking.id}
          </CardTitle>
          <CardDescription>
            Modify the booking details below and save your changes. The original seat count will be restored and the new count will be applied.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdateBooking)}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Route</FormLabel>
                      <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('scheduleId', '');
                        }}
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
                           onChange={(e) => {
                                field.onChange(e);
                                form.setValue('scheduleId', '');
                            }}
                        />
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
              </div>
              
              <Separator />

              <div className="space-y-6">
                <h3 className="font-medium text-lg">
                  Passenger Details
                </h3>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 border rounded-lg"
                  >
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.fullName`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-5">
                          <FormLabel>Full Name (Passenger {index + 1})</FormLabel>
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
                        <FormItem className="sm:col-span-3">
                          <FormLabel>Birth Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.fareType`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-3">
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
                          aria-label="Remove passenger"
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
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Passenger
                </Button>
              </div>

              <Separator />
                <h3 className="font-medium text-lg">Contact, Payment & Fees</h3>
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
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium">Fees</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="rebookingFee">Add Rebooking Fee (₱)</Label>
                            <Input id="rebookingFee" type="number" placeholder="0.00" value={rebookingFee} onChange={e => setRebookingFee(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="rebookingReason">Reason for Rebooking Fee</Label>
                           <Textarea id="rebookingReason" placeholder="e.g., Change of travel date" value={rebookingReason} onChange={e => setRebookingReason(e.target.value)} />
                        </div>
                   </div>
                    <FormField
                        control={form.control}
                        name="noShowFee"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>No-Show Fee (₱)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                            </FormControl>
                            <FormDescription>Apply a one-time fee if the passenger did not show.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Payment Status
                      </FormLabel>
                      <FormDescription>
                        Mark this booking as paid or unpaid.
                      </FormDescription>
                    </div>
                    <FormControl>
                       <Switch
                        checked={field.value === 'Paid'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'Paid' : 'Unpaid')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

                <Separator />

                  <div className="space-y-4 rounded-lg border bg-secondary/50 p-4">
                    <h3 className="font-semibold text-lg">Updated Summary</h3>
                     {bookingSummary.details.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm pb-2">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-muted-foreground">{item.fareType}</p>
                            </div>
                            <span className="font-medium">₱{item.price.toFixed(2)}</span>
                        </div>
                    ))}
                    <Separator />
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span>New Base Fare Total:</span>
                            <span>₱{bookingSummary.basePrice.toFixed(2)}</span>
                        </div>

                        {booking.rebookingHistory?.length > 0 && (
                          <div className="text-muted-foreground">
                            <p className="font-medium">Previous Rebooking Fees:</p>
                             {booking.rebookingHistory.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between pl-2">
                                    <span>- {item.reason || 'Rebooking Fee'} on {format(new Date(item.date), 'PP')}</span>
                                    <span>+ ₱{item.fee.toFixed(2)}</span>
                                </div>
                            ))}
                          </div>
                        )}
                       
                        {bookingSummary.currentRebookingFee > 0 && (
                             <div className="flex justify-between text-blue-600">
                                <span>New Rebooking Fee (This Change):</span>
                                <span>+ ₱{bookingSummary.currentRebookingFee.toFixed(2)}</span>
                            </div>
                        )}
                        {bookingSummary.noShowFee > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>No-Show Fee:</span>
                                <span>+ ₱{bookingSummary.noShowFee.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                    <Separator />
                     <div className="flex justify-between items-center text-xl font-bold">
                        <span>New Grand Total</span>
                        <span>₱{bookingSummary.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !form.formState.isValid || watchPassengers.length === 0}
              >
                 {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
