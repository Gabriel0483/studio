'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft, RefreshCw, UserPlus, Loader2, Users, MapPin, CheckCircle2, Clock, Info, Calendar, Ship } from "lucide-react"

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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, useAuthContext } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction, Timestamp, where, query, getDocs, getDoc } from "firebase/firestore"
import React, { useMemo, useState, useEffect, Suspense } from "react"
import { Separator } from "@/components/ui/separator"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { format, addDays, isValid, isBefore, parseISO } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const passengerSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  birthDate: z.string().optional(),
  fareType: z.string({ required_error: "Please select a fare type."}),
});

const bookingFormSchema = z.object({
  departurePort: z.string({ required_error: "Please select a departure port." }),
  routeId: z.string({ required_error: "Please select your destination." }),
  travelDate: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "A date of travel is required."}),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  primaryEmail: z.string().email({ message: "Please enter a valid email address." }),
  primaryPhone: z.string().min(1, { message: "Please enter a contact number." }),
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

function BookingContent() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { isAuthReady } = useAuthContext();
  const router = useRouter();
  
  const [step, setStep] = useState<'form' | 'summary' | 'confirmation'>('form');
  const [bookingSummary, setBookingSummary] = useState<BookingSummary>({ details: [], totalPrice: 0, totalTickets: 0 });
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const restrictedLimit = addDays(today, 6); 
    setDateRange({ 
        min: format(today, "yyyy-MM-dd"), 
        max: format(restrictedLimit, "yyyy-MM-dd") 
    });
  }, []);

  useEffect(() => {
    if (isAuthReady && !isUserLoading && !user) {
        router.replace('/login?redirect=/book');
    }
  }, [isAuthReady, isUserLoading, user, router]);

  const passengerDocRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'passengers', user.uid) : null, [firestore, user]);
  const { data: passengerData } = useDoc(passengerDocRef);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]));
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]));
  const { data: allFares, isLoading: isLoadingFares } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]));
  const { data: ports, isLoading: isLoadingPorts } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'ports') : null, [firestore]));

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      departurePort: "",
      routeId: "",
      travelDate: "",
      scheduleId: "",
      passengers: [],
      primaryEmail: "",
      primaryPhone: "",
    },
  });

  useEffect(() => {
    if (user && passengerData) {
        form.setValue('primaryEmail', passengerData.email || user.email || '');
        form.setValue('primaryPhone', passengerData.phone || '');
    } else if (user) {
        form.setValue('primaryEmail', user.email || '');
    }
  }, [user, passengerData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  
  const watchDeparturePort = form.watch('departurePort');
  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');

  const availableDestinations = useMemo(() => {
    if (!routes || !watchDeparturePort) return [];
    return routes.filter(r => r.departure === watchDeparturePort);
  }, [routes, watchDeparturePort]);

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
    if (watchDeparturePort) {
      form.setValue('routeId', '');
      form.resetField('scheduleId');
    }
  }, [watchDeparturePort, form]);

  useEffect(() => {
    if (watchRouteId) {
      form.resetField('scheduleId');
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleFinalReserve(data: BookingFormData) {
    if (!firestore || !user || !allSchedules) {
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
        
        let finalScheduleData;
        if (!scheduleSnap.exists()) {
          finalScheduleData = {
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
          transaction.set(scheduleRef, finalScheduleData);
        } else {
          finalScheduleData = scheduleSnap.data();
        }

        const currentAvailableSeats = finalScheduleData.availableSeats || 0;
        const currentWaitlistCount = finalScheduleData.waitlistCount || 0;
        const waitlistLimit = finalScheduleData.waitlistLimit ?? 50;

        let status: 'Reserved' | 'Waitlisted' = 'Reserved';

        if (currentAvailableSeats >= totalSeats) {
          transaction.update(scheduleRef, { availableSeats: currentAvailableSeats - totalSeats });
        } else {
          if (currentWaitlistCount + totalSeats > waitlistLimit) {
            throw new Error("Waitlist is full for this trip. Please select a different time.");
          }
          status = 'Waitlisted';
          transaction.update(scheduleRef, { waitlistCount: currentWaitlistCount + totalSeats });
        }
  
        const newBookingRef = doc(collection(firestore, 'bookings'));
        const newBookingId = generateBookingReference();
        const route = routes?.find(r => r.id === finalScheduleData.routeId);
  
        const newBookingData = {
          id: newBookingId,
          passengerId: user.uid,
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
          routeName: getRouteName(finalScheduleData.routeId),
          departurePortName: data.departurePort || finalScheduleData.departurePortName || route?.departure || '',
          status: status,
          paymentStatus: 'Unpaid',
          refundStatus: 'Not Applicable',
          paymentMethod: 'Cash',
        };
  
        transaction.set(newBookingRef, newBookingData);
        return { status, bookingId: newBookingId, finalScheduleId: targetScheduleId };
      });
  
      const passengerRef = doc(firestore, 'passengers', user.uid);
      const mainPassengerName = data.passengers[0].fullName.split(' ');
      setDocumentNonBlocking(passengerRef, {
          id: user.uid,
          firstName: mainPassengerName[0],
          lastName: mainPassengerName.slice(1).join(' '),
          email: data.primaryEmail,
          phone: data.primaryPhone,
      }, { merge: true });
  
      toast({ title: "Booking Successful!", description: `Your booking is now ${bookingStatus}.` });
      const currentScheduleDoc = await getDoc(doc(firestore, 'schedules', finalScheduleId));
      const currentSchedule = currentScheduleDoc.data();
  
      setConfirmedBooking({
        id: bookingId,
        travelDate: data.travelDate,
        routeName: getRouteName(watchRouteId),
        departurePortName: data.departurePort || currentSchedule?.departurePortName || '',
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Booking Failed', description: e.message || 'Could not complete reservation.' });
    } finally {
        setIsReserving(false);
    }
  }

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares || isLoadingPorts || !isAuthReady || isUserLoading || !mounted;
  const currentSchedule = filteredSchedules.find(s => s.id === watchScheduleId);
  const familyMembers = passengerData?.familyMembers || [];

  if (isLoading) {
    return (
        <div className="flex h-64 w-full flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Preparing your booking dashboard...</p>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10 -translate-y-1/2" />
                <div className="flex flex-col items-center gap-2">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step === 'form' ? "bg-primary text-primary-foreground shadow-lg" : "bg-primary/20 text-primary")}>
                        {step === 'summary' || step === 'confirmation' ? <CheckCircle2 className="h-6 w-6" /> : "1"}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Details</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step === 'summary' ? "bg-primary text-primary-foreground shadow-lg" : (step === 'confirmation' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"))}>
                        {step === 'confirmation' ? <CheckCircle2 className="h-6 w-6" /> : "2"}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Summary</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step === 'confirmation' ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground")}>
                        3
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
                </div>
            </div>
          </div>

          <Card className="mx-auto max-w-3xl shadow-xl overflow-hidden border-none ring-1 ring-border">
            <CardHeader className="bg-primary/5 text-center pb-8 border-b">
              <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                {step === 'form' && 'Plan Your Voyage'}
                {step === 'summary' && 'Review Your Trip'}
                {step === 'confirmation' && 'Smooth Sailing!'}
              </CardTitle>
              <CardDescription className="text-base">
                {step === 'form' && "Select your ports and add passengers to get started."}
                {step === 'summary' && "Verify your itinerary and passenger details before booking."}
                {step === 'confirmation' && "Your seats are secured. We've sent a copy to your email."}
              </CardDescription>
            </CardHeader>
            
            {step === 'form' && (
              <CardContent className="pt-8 space-y-8">
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-bold">Booking Integrity Guard</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        To ensure fleet readiness and passenger safety, online reservations are strictly limited to the next 7 days.
                    </AlertDescription>
                </Alert>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                            <MapPin className="h-4 w-4" />
                            Route Selection
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="departurePort"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Departure Port</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 border-2 hover:border-primary transition-all bg-muted/5">
                                        <SelectValue placeholder="Select Departure" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {ports?.map(port => (
                                            <SelectItem key={port.id} value={port.name}>
                                                {port.name}
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
                                name="routeId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Destination</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchDeparturePort}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 border-2 hover:border-primary transition-all bg-muted/5">
                                        <SelectValue placeholder={!watchDeparturePort ? "Choose Port first" : "Choose Destination"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableDestinations.map(route => (
                                            <SelectItem key={route.id} value={route.id}>
                                                {route.destination}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="travelDate"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Date of Travel</FormLabel>
                                    <FormControl>
                                    <div className="relative">
                                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input type="date" {...field} min={dateRange.min} max={dateRange.max} disabled={!watchRouteId} className="h-12 pl-10 border-2 hover:border-primary bg-muted/5" />
                                    </div>
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
                                    <FormLabel>Departure Time</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchRouteId || !watchTravelDate}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 border-2 hover:border-primary transition-all bg-muted/5">
                                        <SelectValue placeholder="Select Departure Time" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredSchedules.length > 0 ? (
                                          filteredSchedules.map(schedule => {
                                            const isWaitlistFull = schedule.waitlistCount >= (schedule.waitlistLimit ?? 50);
                                            return (
                                              <SelectItem key={schedule.id} value={schedule.id} disabled={schedule.availableSeats <= 0 && isWaitlistFull}>
                                                  <div className="flex flex-col w-full text-left">
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                      <span className="font-bold">{schedule.departureTime}</span>
                                                      {schedule.availableSeats > 0 ? (
                                                        <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">{schedule.availableSeats} seats left</Badge>
                                                      ) : isWaitlistFull ? (
                                                        <Badge variant="destructive" className="text-[10px]">Trip Full</Badge>
                                                      ) : (
                                                        <Badge variant="outline" className="text-[10px] flex items-center gap-1 border-orange-200 text-orange-600 bg-orange-50"><Clock className="h-3 w-3" /> Waitlist Open</Badge>
                                                      )}
                                                    </div>
                                                    {schedule.shipName && (
                                                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                                                        <Ship className="h-3 w-3" /> {schedule.shipName}
                                                      </div>
                                                    )}
                                                  </div>
                                              </SelectItem>
                                            );
                                          })
                                        ) : (
                                          <div className="p-4 text-center text-sm text-muted-foreground">
                                            No trips found for this date.
                                          </div>
                                        )}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                            <Users className="h-4 w-4" />
                            Passenger Details
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const userName = (passengerData?.firstName && passengerData?.lastName) ? `${passengerData.firstName} ${passengerData.lastName}`.trim() : user?.displayName || '';
                                    append({ id: nanoid(), fullName: userName, birthDate: passengerData?.birthDate || '', fareType: "" });
                                }}
                                disabled={!watchScheduleId}
                                className="h-8 rounded-full px-4 hover:bg-primary hover:text-white transition-all"
                            >
                                <UserPlus className="mr-2 h-3.5 w-3.5" /> Just Me
                            </Button>
                            {familyMembers.length > 0 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" disabled={!watchScheduleId} className="h-8 rounded-full px-4">
                                            <Users className="mr-2 h-3.5 w-3.5" /> +Family
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64" align="end">
                                        <div className="grid gap-2">
                                            <h4 className="font-bold text-xs uppercase text-muted-foreground border-b pb-2 mb-1">Saved Travelers</h4>
                                            {familyMembers.map((member: any) => (
                                                <Button 
                                                    key={member.id} 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="justify-start font-medium h-9" 
                                                    onClick={() => append({ id: member.id, fullName: member.fullName, birthDate: member.birthDate, fareType: '' })}
                                                >
                                                    {member.fullName}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                      </div>

                      {fields.length === 0 ? (
                        <div className="text-center py-16 px-4 border-2 border-dashed rounded-2xl bg-muted/10 animate-in fade-in duration-500">
                            <div className="bg-primary/5 p-4 rounded-full w-fit mx-auto mb-4">
                                <Users className="h-8 w-8 text-primary/40" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium mb-6">Select a trip and add your passengers to continue.</p>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                                disabled={!watchScheduleId}
                                className="shadow-lg"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add First Passenger
                            </Button>
                        </div>
                        ) : (
                        <div className="grid gap-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-6 bg-card border-2 rounded-2xl shadow-sm relative group hover:border-primary/40 transition-all animate-in slide-in-from-bottom-2">
                                    <div className="sm:col-span-6 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`passengers.${index}.fullName`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Legal Full Name</FormLabel>
                                                <FormControl>
                                                <Input placeholder="As shown on ID" {...field} className="h-10 border-muted bg-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="sm:col-span-3 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`passengers.${index}.birthDate`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Birth Date</FormLabel>
                                                <FormControl>
                                                <Input type="date" {...field} className="h-10 border-muted bg-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`passengers.${index}.fareType`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 border-muted bg-white">
                                                            <SelectValue placeholder="Fare" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableFares.map(fare => (
                                                            <SelectItem key={fare.id} value={fare.passengerType}>
                                                                {fare.passengerType} (₱{fare.price.toFixed(0)})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="h-10 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-14 border-dashed border-2 bg-muted/5 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all rounded-2xl"
                                onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                                disabled={!watchScheduleId}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Traveler
                            </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-primary/[0.02] p-8 rounded-2xl border border-primary/10">
                        <FormField
                            control={form.control}
                            name="primaryPhone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-bold">Emergency Contact Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 09171234567" {...field} className="h-12 bg-white" />
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
                                <FormLabel className="font-bold">Email for Itinerary</FormLabel>
                                <FormControl>
                                    <Input placeholder="you@example.com" {...field} className="h-12 bg-white" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" size="lg" className="w-full h-16 text-xl font-bold shadow-xl rounded-2xl" disabled={!form.formState.isValid || totalSeats === 0}>
                      Proceed to Review
                    </Button>
                  </form>
                </Form>
              </CardContent>
            )}
            
            {step === 'summary' && (
              <>
                <CardContent className="pt-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-muted/30 p-8 rounded-3xl border-2 border-primary/10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                    
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Confirmed Route</span>
                            <h3 className="font-black text-2xl tracking-tighter">{getRouteName(watchRouteId)}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                                <MapPin className="h-4 w-4 text-primary" /> {watchDeparturePort} Terminal
                            </p>
                        </div>
                        <div className="text-right space-y-1">
                            <Badge className="font-mono text-sm bg-primary text-primary-foreground rounded-full px-4">
                                {watchTravelDate && isValid(new Date(watchTravelDate)) 
                                    ? format(new Date(watchTravelDate), 'PPP') 
                                    : '...'}
                            </Badge>
                            <p className="font-black text-2xl tracking-tight text-foreground">{currentSchedule?.departureTime}</p>
                        </div>
                    </div>
                    
                    <Separator className="bg-primary/10" />

                    <div className="space-y-4">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Traveler Manifest</h4>
                        <div className="grid gap-3">
                            {bookingSummary.details.map((item, index) => (
                                <div key={index} className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                                    <div>
                                        <p className="font-black text-sm">{item.name}</p>
                                        <Badge variant="outline" className="text-[10px] mt-0.5 uppercase tracking-tighter opacity-70">{item.fareType}</Badge>
                                    </div>
                                    <span className="font-black text-sm font-mono text-primary">₱{item.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-primary/10" />

                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grand Total</span>
                            <p className="text-[10px] text-muted-foreground italic">Incl. terminal fees & service tax</p>
                        </div>
                        <div className="text-right">
                          <span className="text-4xl font-black tracking-tighter text-primary">₱{bookingSummary.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-3 p-8 pt-0">
                    <Button variant="ghost" size="lg" className="w-full sm:w-auto h-14 rounded-2xl font-bold" onClick={() => setStep('form')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
                    </Button>
                    <Button onClick={() => handleFinalReserve(form.getValues())} size="lg" className="w-full h-14 flex-1 shadow-xl rounded-2xl text-lg font-black" disabled={isReserving}>
                        {isReserving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Secure My Reservation
                    </Button>
                </CardFooter>
              </>
            )}

            {step === 'confirmation' && confirmedBooking && (
              <CardContent className="pt-8 animate-in fade-in duration-1000">
                <div className="border-2 border-primary/20 rounded-[2rem] p-4 bg-primary/[0.02] shadow-inner">
                    <TripItinerary booking={confirmedBooking} />
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold border-2" onClick={() => { form.reset(); setStep('form'); setConfirmedBooking(null); }}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Start New Booking
                    </Button>
                    <Button variant="default" size="lg" className="flex-1 h-14 rounded-2xl font-black shadow-lg" onClick={() => router.push('/my-bookings')}>
                        Manage My Trips
                    </Button>
                </div>
              </CardContent>
            )}
          </Card>
    </div>
  )
}

export default function BookingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-24">
            <Suspense fallback={
                <div className="flex h-64 w-full flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Synchronizing with terminal database...</p>
                </div>
            }>
                <BookingContent />
            </Suspense>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
