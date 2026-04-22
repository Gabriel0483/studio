'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft, RefreshCw, Loader2, UserSearch, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction, Timestamp, where, query, getDocs, getDoc } from "firebase/firestore"
import React, { useMemo, useState, useEffect } from "react"
import { Separator } from "@/components/ui/separator"
import { format, addDays, isValid, isBefore, parseISO } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary";
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const passengerSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  birthDate: z.string().optional(),
  fareType: z.string({ required_error: "Please select a fare type."}),
});

const bookingFormSchema = z.object({
  routeId: z.string({ required_error: "Please select a route." }),
  travelDate: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "A date of travel is required."}),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  primaryEmail: z.string().email({ message: "Please enter a valid email address." }),
  primaryPhone: z.string().min(1, { message: "Please enter a contact number." }),
  isPaid: z.boolean().default(false),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

type BookingSummary = {
  details: {
    name: string;
    fareType: string;
    price: number;
  }[];
  totalPrice: number;
  totalTickets: number;
};

type ConfirmedBooking = {
  id: string;
  travelDate: string;
  routeName: string;
  departurePortName: string;
  departureTime: string;
  arrivalTime: string;
  passengers: { fullName: string; fareType: string }[];
  totalPrice: number;
  status: 'Reserved' | 'Waitlisted' | 'Confirmed';
  bookingDate: Date;
  primaryEmail: string;
  primaryPhone: string;
};

const generateBookingReference = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function DeskBookingPage() {
  const firestore = useFirestore();
  const router = useRouter();
  
  const [step, setStep] = useState<'form' | 'summary' | 'confirmation'>('form');
  const [bookingSummary, setBookingSummary] = useState<BookingSummary>({ details: [], totalPrice: 0, totalTickets: 0 });
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [mounted, setMounted] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [foundPassenger, setFoundPassenger] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const sixtyDaysFromNow = addDays(today, 59);
    setDateRange({ 
        min: format(today, "yyyy-MM-dd"), 
        max: format(sixtyDaysFromNow, "yyyy-MM-dd") 
    });
  }, []);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]));
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]));
  const { data: allFares, isLoading: isLoadingFares } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]));

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: "",
      scheduleId: "",
      passengers: [{ id: nanoid(), fullName: "", birthDate: "", fareType: "" }],
      primaryEmail: "",
      primaryPhone: "",
      isPaid: false,
    },
  });

  useEffect(() => {
    if (foundPassenger) {
        form.setValue('passengers', [{ id: foundPassenger.id, fullName: `${foundPassenger.firstName || ''} ${foundPassenger.lastName || ''}`.trim(), birthDate: foundPassenger.birthDate || "", fareType: "" }]);
        form.setValue('primaryEmail', foundPassenger.email || '');
        form.setValue('primaryPhone', foundPassenger.phone || '');
    } else {
        const currentPassengers = form.getValues('passengers');
        if (currentPassengers.length === 0 || (currentPassengers.length === 1 && !currentPassengers[0].fullName)) {
            form.setValue('passengers', [{ id: nanoid(), fullName: '', birthDate: '', fareType: '' }]);
            form.setValue('primaryEmail', '');
            form.setValue('primaryPhone', '');
        }
    }
  }, [foundPassenger, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  
  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');

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
    form.resetField('scheduleId');
    setAvailableFares([]);
  }, [watchRouteId, form]);

  useEffect(() => {
    const selectedSchedule = filteredSchedules?.find(s => s.id === watchScheduleId);
    if (selectedSchedule && routes && allFares) {
      const route = routes.find(r => r.id === selectedSchedule.routeId);
      const routeFares = allFares.filter(f => f.routeId === route?.id);
      setAvailableFares(routeFares);
    } else {
      setAvailableFares([]);
    }
  }, [watchScheduleId, filteredSchedules, routes, allFares]);

  const totalSeats = watchPassengers.length;
  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';
  
  const calculateBookingSummary = (data: BookingFormData): BookingSummary => {
    if (!data.passengers || !Array.isArray(data.passengers)) {
      return { details: [], totalPrice: 0, totalTickets: 0 };
    }
    const fareDetails = data.passengers
      .map(passenger => {
        if (!passenger.fareType) return null;
        const fareInfo = availableFares.find(f => f.passengerType === passenger.fareType);
        return {
          name: passenger.fullName || 'Passenger',
          fareType: passenger.fareType,
          price: fareInfo?.price || 0,
        };
      })
      .filter((item): item is { name: string; fareType: string; price: number } => item !== null);
  
    const totalPrice = fareDetails.reduce((acc, detail) => acc + (detail?.price || 0), 0);
    
    return {
      details: fareDetails,
      totalPrice,
      totalTickets: data.passengers.length,
    };
  };

  const handleFormSubmit = (data: BookingFormData) => {
    const summary = calculateBookingSummary(data);
    setBookingSummary(summary);
    setStep('summary');
  };

  async function handleFinalReserve(data: BookingFormData) {
    if (!firestore || !allSchedules) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect. Please try again.' });
      return;
    }
  
    setIsReserving(true);
    const summary = calculateBookingSummary(data);
    const travelDateObj = parseISO(data.travelDate);
    const formattedTravelDate = format(travelDateObj, 'yyyy-MM-dd');
  
    try {
      let targetScheduleId = data.scheduleId;
      const selectedScheduleTemplate = allSchedules.find(s => s.id === data.scheduleId);
      if (!selectedScheduleTemplate) throw new Error("Selected schedule is invalid.");

      if (selectedScheduleTemplate.tripType === 'Daily') {
        const spawnedScheduleQuery = query(
          collection(firestore, 'schedules'),
          where('sourceScheduleId', '==', data.scheduleId),
          where('date', '==', formattedTravelDate)
        );
        const spawnedSchedules = await getDocs(spawnedScheduleQuery);
        if (!spawnedSchedules.empty) {
          targetScheduleId = spawnedSchedules.docs[0].id;
        } else {
          targetScheduleId = doc(collection(firestore, 'schedules')).id;
        }
      }

      const { status: bookingStatus, bookingId, finalScheduleId } = await runTransaction(firestore, async (transaction) => {
        const scheduleRef = doc(firestore, 'schedules', targetScheduleId);
        const scheduleSnap = await transaction.get(scheduleRef);
        
        let scheduleData;
        if (!scheduleSnap.exists()) {
          scheduleData = {
            ...selectedScheduleTemplate,
            tripType: 'Special',
            date: formattedTravelDate,
            sourceScheduleId: data.scheduleId,
            id: targetScheduleId,
            availableSeats: selectedScheduleTemplate.availableSeats || 0,
            waitlistLimit: selectedScheduleTemplate.waitlistLimit || 50,
            waitlistCount: 0,
            boardingStatus: 'Awaiting',
            status: 'On Time'
          };
          transaction.set(scheduleRef, scheduleData);
        } else {
          scheduleData = scheduleSnap.data();
        }

        const currentAvailableSeats = scheduleData.availableSeats || 0;
        const currentWaitlistCount = scheduleData.waitlistCount || 0;
        const waitlistLimit = scheduleData.waitlistLimit ?? 50;

        let status: 'Reserved' | 'Waitlisted' | 'Confirmed';
        let paymentStatus: 'Paid' | 'Unpaid' = data.isPaid ? 'Paid' : 'Unpaid';

        if (currentAvailableSeats >= totalSeats) {
          transaction.update(scheduleRef, { availableSeats: currentAvailableSeats - totalSeats });
          status = data.isPaid ? 'Confirmed' : 'Reserved';
        } else {
          if (currentWaitlistCount + totalSeats > waitlistLimit) {
            throw new Error("Waitlist capacity reached for this trip.");
          }
          status = 'Waitlisted';
          paymentStatus = 'Unpaid';
          transaction.update(scheduleRef, { waitlistCount: currentWaitlistCount + totalSeats });
        }
  
        const newBookingRef = doc(collection(firestore, 'bookings'));
        const newBookingId = generateBookingReference();
        const passengerId = foundPassenger ? foundPassenger.id : nanoid();
        const route = routes?.find(r => r.id === scheduleData.routeId);

        const newBookingData = {
          id: newBookingId,
          passengerId: passengerId,
          passengerInfo: data.passengers.map(p => ({
            id: p.id,
            fullName: p.fullName,
            birthDate: p.birthDate || null,
            fareType: p.fareType,
          })),
          passengerEmail: data.primaryEmail,
          passengerPhone: data.primaryPhone,
          scheduleId: targetScheduleId,
          fareDetails: summary.details.map(d => {
            const fareInfo = availableFares.find(f => f.passengerType === d.fareType);
            return {
              fareId: fareInfo?.id || null,
              passengerType: d.fareType,
              count: 1,
              pricePerTicket: fareInfo?.price || 0,
            };
          }),
          bookingDate: serverTimestamp(),
          travelDate: Timestamp.fromDate(travelDateObj),
          numberOfSeats: totalSeats,
          totalPrice: summary.totalPrice,
          routeName: getRouteName(scheduleData.routeId),
          departurePortName: scheduleData.departurePortName || route?.departure || '',
          status: status,
          paymentStatus: paymentStatus,
          refundStatus: 'Not Applicable',
          paymentMethod: data.isPaid ? 'Cash' : 'Unpaid',
        };
  
        transaction.set(newBookingRef, newBookingData);
        return { status, bookingId: newBookingId, finalScheduleId: targetScheduleId };
      });
  
      toast({ title: "Booking Successful!", description: `Booking is now ${bookingStatus}.` });
      const currentScheduleDoc = await getDoc(doc(firestore, 'schedules', finalScheduleId));
      const currentSchedule = currentScheduleDoc.data();
  
      setConfirmedBooking({
        id: bookingId,
        travelDate: data.travelDate,
        routeName: getRouteName(watchRouteId),
        departurePortName: currentSchedule?.departurePortName || '',
        departureTime: currentSchedule?.departureTime || '',
        arrivalTime: currentSchedule?.arrivalTime || '',
        passengers: data.passengers.map(p => ({ fullName: p.fullName, fareType: p.fareType })),
        totalPrice: summary.totalPrice,
        status: bookingStatus,
        bookingDate: new Date(),
        primaryEmail: data.primaryEmail,
        primaryPhone: data.primaryPhone,
      });
  
      setStep('confirmation');
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Booking Failed", description: e.message || "Could not complete your booking." });
    } finally {
        setIsReserving(false);
    }
  }

  const handlePassengerSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setFoundPassenger(null);
    try {
        let foundDoc = null;
        const emailQuery = query(collection(firestore, 'passengers'), where('email', '==', searchQuery));
        let querySnapshot = await getDocs(emailQuery);
        if (!querySnapshot.empty) {
            foundDoc = querySnapshot.docs[0];
        } else {
            const phoneQuery = query(collection(firestore, 'passengers'), where('phone', '==', searchQuery));
            querySnapshot = await getDocs(phoneQuery);
            if (!querySnapshot.empty) {
                foundDoc = querySnapshot.docs[0];
            }
        }
        if (foundDoc) {
            setFoundPassenger({ ...foundDoc.data(), id: foundDoc.id });
            toast({ title: 'Passenger Found', description: 'Form has been pre-filled with passenger details.' });
        } else {
            toast({ variant: 'destructive', title: 'Passenger Not Found', description: 'No passenger found. Proceed with manual entry.' });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Search Error', description: 'Could not perform passenger search.' });
    } finally {
        setIsSearching(false);
    }
  };

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares || !mounted;
  const currentSchedule = filteredSchedules.find(s => s.id === watchScheduleId);

  if (isLoading) {
      return (
          <div className="flex h-64 w-full flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Preparing desk dashboard...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {step === 'form' && 'Desk Booking'}
            {step === 'summary' && 'Trip Itinerary'}
            {step === 'confirmation' && 'Booking Confirmed!'}
          </CardTitle>
          <CardDescription>
            {step === 'form' && "Create a new booking for a passenger at your terminal."}
            {step === 'summary' && "Please review the itinerary before confirming the booking."}
            {step === 'confirmation' && "The booking is complete. You can print the itinerary below."}
          </CardDescription>
        </CardHeader>
        
        {step === 'form' && (
          <CardContent>
            <div className="space-y-4 rounded-lg border p-4 mb-8">
                <h3 className="font-medium text-lg">Find Existing Passenger</h3>
                <div className="flex w-full items-center space-x-2">
                    <Input
                        placeholder="Search by Email or Phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="button" onClick={handlePassengerSearch} disabled={isSearching || !searchQuery}>
                        {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserSearch className="mr-2 h-4 w-4" />}
                        Search
                    </Button>
                </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="routeId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Route</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                              <Input type="date" {...field} min={dateRange.min} max={dateRange.max} disabled={!watchRouteId} />
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchRouteId || !watchTravelDate}>
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
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="space-y-6">
                  <h3 className="font-medium text-lg border-b pb-2">Passenger Details</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 border rounded-lg relative">
                      <FormField
                        control={form.control}
                        name={`passengers.${index}.fullName`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
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
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Fare Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!watchScheduleId}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Fare" />
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
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="w-full">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })} disabled={!watchScheduleId}>
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
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Process Payment</FormLabel>
                        <FormDescription>Mark this booking as paid immediately.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={!form.formState.isValid || totalSeats === 0}>
                  Proceed to Summary
                </Button>
              </form>
            </Form>
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
                    <p className="font-medium">{format(new Date(watchTravelDate), 'PPP')} at {currentSchedule?.departureTime}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Passenger Breakdown</h3>
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
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setStep('form')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button onClick={() => handleFinalReserve(form.getValues())} size="lg" className="w-full sm:w-auto flex-1" disabled={isReserving}>
                    {isReserving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Booking
                </Button>
            </CardFooter>
          </>
        )}

        {step === 'confirmation' && confirmedBooking && (
          <CardContent>
            <TripItinerary booking={confirmedBooking} />
            <Button variant="outline" className="w-full mt-6" onClick={() => { form.reset(); setStep('form'); setConfirmedBooking(null); }}>
              New Booking
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
