
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Loader2, Receipt } from 'lucide-react';

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
  useDoc,
} from '@/firebase';
import { collection, doc, runTransaction, Timestamp, query, where, getDocs, serverTimestamp, getDoc, orderBy } from 'firebase/firestore';
import React, { useMemo, useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { format, isValid, parseISO, isBefore } from 'date-fns';
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
  const [minDate, setMinDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMinDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(useMemoFirebase(() => (firestore ? collection(firestore, 'schedules') : null), [firestore]));
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(useMemoFirebase(() => (firestore ? collection(firestore, 'routes') : null), [firestore]));
  const { data: allFares, isLoading: isLoadingFares } = useCollection(useMemoFirebase(() => (firestore ? collection(firestore, 'fares') : null), [firestore]));
  
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'settings') : null), [firestore]);
  const { data: configData } = useDoc(configRef);

  useEffect(() => {
    if (configData?.defaultRebookingFee && rebookingFee === 0) {
        setRebookingFee(configData.defaultRebookingFee);
    }
  }, [configData, rebookingFee]);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
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

  const filteredSchedules = useMemo(() => {
    if (!watchRouteId || !watchTravelDate || !allSchedules) return [];

    const selectedDate = parseISO(watchTravelDate);
    if (!isValid(selectedDate)) return [];

    const formattedTravelDate = format(selectedDate, 'yyyy-MM-dd');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(selectedDate, today)) return [];

    const isToday = formattedTravelDate === format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const specialTrips = allSchedules.filter(s => 
      s.tripType === 'Special' && 
      s.date === formattedTravelDate &&
      (!isToday || s.departureTime > currentTime)
    );

    const dailyTrips = allSchedules.filter(s => s.tripType === 'Daily' && s.routeId === watchRouteId && (!isToday || s.departureTime > currentTime));

    const dailyTripInstances = dailyTrips.map(dailyTrip => {
      const existingInstance = specialTrips.find(st => st.sourceScheduleId === dailyTrip.id);
      return existingInstance || { ...dailyTrip, isVirtual: true };
    });

    return [...specialTrips.filter(st => !st.sourceScheduleId), ...dailyTripInstances]
      .sort((a, b) => a.departureTime.localeCompare(b.departureTime));

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
    if (!watchPassengers) return { details: [], totalPrice: 0, totalTickets: 0 };

    const fareDetails = watchPassengers.map((passenger) => {
      const fareInfo = availableFares.find((f) => f.passengerType === passenger.fareType);
      return {
        name: passenger.fullName || 'Passenger',
        fareType: passenger.fareType,
        price: fareInfo?.price || 0,
      };
    }).filter(item => !!item.fareType);

    const basePrice = fareDetails.reduce((acc, detail) => acc + detail.price, 0);
    const historicalRebookingFees = booking?.rebookingHistory?.reduce((acc: number, item: any) => acc + item.fee, 0) || 0;
    const noShowFee = watchNoShowFee || 0;
    const currentRebookingFee = rebookingFee || 0;
    const totalFees = historicalRebookingFees + currentRebookingFee + noShowFee;

    return {
      details: fareDetails,
      basePrice,
      historicalRebookingFees,
      currentRebookingFee,
      noShowFee,
      totalPrice: basePrice + totalFees,
      totalTickets: watchPassengers.length,
    };
  }, [watchPassengers, availableFares, booking, rebookingFee, watchNoShowFee]);

  async function handleUpdateBooking(data: BookingFormData) {
    if (!firestore || !booking || !allSchedules) return;
    setIsSubmitting(true);

    const newSeats = data.passengers.length;
    const oldScheduleRef = doc(firestore, 'schedules', booking.scheduleId);
    const newScheduleRef = doc(firestore, 'schedules', data.scheduleId);

    const oldWaitlistQuery = query(collection(firestore, 'bookings'), where('scheduleId', '==', booking.scheduleId), where('status', '==', 'Waitlisted'), orderBy('bookingDate', 'asc'));
    const oldWaitlistSnap = await getDocs(oldWaitlistQuery);

    try {
        await runTransaction(firestore, async (transaction) => {
            const bookingRef = doc(firestore, 'bookings', booking.firestoreId);
            const oldScheduleDoc = await transaction.get(oldScheduleRef);
            const newScheduleDoc = await transaction.get(newScheduleRef);

            if (!newScheduleDoc.exists()) throw new Error("The selected trip template no longer exists.");

            if (oldScheduleDoc.exists() && (booking.status === 'Reserved' || booking.status === 'Confirmed')) {
                let oldSeats = (oldScheduleDoc.data().availableSeats || 0) + booking.numberOfSeats;
                let oldWaitCount = oldScheduleDoc.data().waitlistCount || 0;

                for (const wDoc of oldWaitlistSnap.docs) {
                  const wData = wDoc.data();
                  if (wData.numberOfSeats <= oldSeats) {
                    transaction.update(wDoc.ref, { status: 'Reserved' });
                    oldSeats -= wData.numberOfSeats;
                    oldWaitCount = Math.max(0, oldWaitCount - wData.numberOfSeats);
                  }
                }
                transaction.update(oldScheduleRef, { availableSeats: oldSeats, waitlistCount: oldWaitCount });
            }

            let newAvailable = newScheduleDoc.data().availableSeats || 0;
            let newWaitCount = newScheduleDoc.data().waitlistCount || 0;
            let newStatus = booking.status;

            if (newAvailable >= newSeats) {
                newAvailable -= newSeats;
                if (newStatus === 'Waitlisted' || data.paymentStatus === 'Paid' || booking.paymentStatus === 'Paid') {
                    newStatus = (data.paymentStatus === 'Paid' || booking.paymentStatus === 'Paid') ? 'Confirmed' : 'Reserved';
                }
            } else {
                newStatus = 'Waitlisted';
                newWaitCount += newSeats;
            }
            
            const route = routes?.find(r => r.id === newScheduleDoc.data().routeId);

            transaction.update(newScheduleRef, { availableSeats: newAvailable, waitlistCount: newWaitCount });
            transaction.update(bookingRef, {
                passengerInfo: data.passengers.map((p) => ({ fullName: p.fullName, birthDate: p.birthDate || null, fareType: p.fareType })),
                passengerEmail: data.primaryEmail,
                passengerPhone: data.primaryPhone,
                scheduleId: newScheduleRef.id,
                travelDate: Timestamp.fromDate(new Date(data.travelDate)),
                numberOfSeats: newSeats,
                totalPrice: bookingSummary.totalPrice,
                routeName: getRouteName(newScheduleDoc.data().routeId),
                departurePortName: newScheduleDoc.data().departurePortName || route?.departure || '',
                status: newStatus,
                paymentStatus: data.paymentStatus,
                rebookingHistory: [...(booking.rebookingHistory || []), ...(rebookingFee > 0 ? [{ fee: rebookingFee, date: Timestamp.now(), reason: rebookingReason || 'Rebooking' }] : [])],
                noShowFee: data.noShowFee || null,
                lastUpdated: serverTimestamp()
            });
        });

        toast({ title: 'Booking Updated', description: 'Changes saved and waitlists processed.' });
        router.push('/dashboard/bookings');
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares || isLoadingBooking || !mounted;
  if (isLoading) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!booking) return <div className="p-8 text-center">Booking not found.</div>;

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
           <Button variant="ghost" size="sm" className="w-fit p-0 h-auto mb-2" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
            </Button>
          <CardTitle className="text-3xl font-bold tracking-tight">Edit Booking #{booking.id}</CardTitle>
          <CardDescription>
            Modify the booking details. Releasing seats will automatically promote waitlisted passengers (FCFS).
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateBooking)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Route</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v); form.setValue('scheduleId', ''); }} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger></FormControl>
                        <SelectContent>{routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
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
                        <Input type="date" {...field} min={minDate} onChange={(e) => { field.onChange(e); form.setValue('scheduleId', ''); }} />
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchRouteId || !watchTravelDate}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {filteredSchedules.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.departureTime} - {s.arrivalTime} ({s.availableSeats} seats left)</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              
              <Separator />

              <div className="space-y-6">
                <h3 className="font-medium text-lg">Passenger Details</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.fullName`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-5">
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
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
                          <FormControl><Input type="date" {...field} /></FormControl>
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchScheduleId}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Fare" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {availableFares.map((f) => (
                                <SelectItem key={f.id} value={f.passengerType}>{f.passengerType} (₱{f.price.toFixed(2)})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-1">
                      {index > 0 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="w-full">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ fullName: '', birthDate: '', fareType: '' })} disabled={!watchScheduleId}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Passenger
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="primaryPhone" render={({ field }) => (
                    <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="e.g., 09171234567" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="primaryEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="space-y-4 rounded-lg border p-4 bg-secondary/10">
                <h4 className="font-bold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    Adjustment Fees
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Add Rebooking Fee (₱)</Label>
                        <Input type="number" value={rebookingFee} onChange={e => setRebookingFee(parseFloat(e.target.value) || 0)} />
                        <p className="text-[10px] text-muted-foreground">Default loaded from system settings.</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Adjustment Reason</Label>
                        <Textarea placeholder="e.g., Change of travel date" value={rebookingReason} onChange={e => setRebookingReason(e.target.value)} rows={2} />
                    </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Payment Status</FormLabel>
                      <FormDescription>Mark as Paid or Unpaid.</FormDescription>
                    </div>
                    <FormControl>
                       <Switch checked={field.value === 'Paid'} onCheckedChange={(c) => field.onChange(c ? 'Paid' : 'Unpaid')} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" className="w-full h-14 font-black" disabled={isSubmitting || !form.formState.isValid}>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Booking Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
