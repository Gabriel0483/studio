
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft, RefreshCw, UserPlus, Loader2, Users, MapPin, CheckCircle2 } from "lucide-react"

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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, useAuthContext, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction, Timestamp, where, query, getDocs, getDoc } from "firebase/firestore"
import React, { useMemo, useState, useEffect, Suspense } from "react"
import { Separator } from "@/components/ui/separator"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { format, addDays, isValid } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (isAuthReady && !isUserLoading && !user) {
        router.replace('/login?redirect=/book');
    }
  }, [isAuthReady, isUserLoading, user, router]);

  const passengerDocRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'passengers', user.uid) : null, [firestore, user]);
  const { data: passengerData } = useDoc(passengerDocRef);

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresQuery = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  const portsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'ports') : null, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);
  const { data: ports, isLoading: isLoadingPorts } = useCollection(portsQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      departurePort: "",
      routeId: "",
      travelDate: "",
      scheduleId: "",
      passengers: [],
      primaryEmail: user?.email || "",
      primaryPhone: "",
    },
  });

  useEffect(() => {
    const today = new Date();
    const sixtyDaysFromNow = addDays(today, 60);
    
    const minDate = format(today, "yyyy-MM-dd");
    const maxDate = format(sixtyDaysFromNow, "yyyy-MM-dd");
    
    setDateRange({ min: minDate, max: maxDate });
    if (!form.getValues('travelDate')) {
        form.setValue('travelDate', minDate);
    }
  }, [form]);

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

    const selectedDate = new Date(watchTravelDate);
    if (!isValid(selectedDate)) return [];
    
    selectedDate.setHours(0, 0, 0, 0);
    const formattedTravelDate = format(selectedDate, 'yyyy-MM-dd');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = selectedDate.getTime() === today.getTime();
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
    form.setValue('routeId', '');
    form.resetField('scheduleId');
    setAvailableFares([]);
  }, [watchDeparturePort, form]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleFinalReserve(data: BookingFormData) {
    if (!firestore || !user || !allSchedules) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect. Please try again.' });
      return;
    }
  
    setIsReserving(true);
  
    const { scheduleId } = data;
    const summary = calculateBookingSummary(data);
    const travelDateObj = new Date(data.travelDate);
    if (!isValid(travelDateObj)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid travel date.' });
        setIsReserving(false);
        return;
    }
    const formattedTravelDate = format(travelDateObj, 'yyyy-MM-dd');
  
    try {
      // PRE-TRANSACTION: Resolve the exact schedule document reference
      let targetScheduleId = scheduleId;
      const selectedScheduleTemplate = allSchedules.find(s => s.id === scheduleId);
      
      if (!selectedScheduleTemplate) throw new Error("Selected schedule template is invalid.");

      if (selectedScheduleTemplate.tripType === 'Daily') {
        const spawnedScheduleQuery = query(
          collection(firestore, 'schedules'),
          where('sourceScheduleId', '==', scheduleId),
          where('date', '==', formattedTravelDate)
        );
        const spawnedSchedules = await getDocs(spawnedScheduleQuery);
        if (!spawnedSchedules.empty) {
          targetScheduleId = spawnedSchedules.docs[0].id;
        } else {
          // IMPORTANT: generate a fresh ID if we need to create one
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
            sourceScheduleId: scheduleId,
            id: targetScheduleId,
            availableSeats: selectedScheduleTemplate.availableSeats || 0,
          };
        } else {
          finalScheduleData = scheduleSnap.data();
        }

        const currentAvailableSeats = finalScheduleData.availableSeats || 0;
        let status: 'Reserved' | 'Waitlisted' = 'Reserved';

        if (currentAvailableSeats >= totalSeats) {
          const newAvailableSeats = currentAvailableSeats - totalSeats;
          if (!scheduleSnap.exists()) {
            transaction.set(scheduleRef, { ...finalScheduleData, availableSeats: newAvailableSeats });
          } else {
            transaction.update(scheduleRef, { availableSeats: newAvailableSeats });
          }
        } else {
          status = 'Waitlisted';
          if (!scheduleSnap.exists()) {
             transaction.set(scheduleRef, finalScheduleData);
          }
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
      const passengerDataToSave = {
          id: user.uid,
          firstName: mainPassengerName[0],
          lastName: mainPassengerName.slice(1).join(' '),
          email: data.primaryEmail,
          phone: data.primaryPhone,
      };
      setDocumentNonBlocking(passengerRef, passengerDataToSave, { merge: true });
  
      toast({
        title: "Booking Successful!",
        description: `Your booking is now ${bookingStatus}.`,
      });
  
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
      console.error("Booking transaction failed:", e);
      
      const isPermissionError = e.code === 'permission-denied' || e.message?.toLowerCase().includes('permission');
      
      if (isPermissionError) {
        const permissionError = new FirestorePermissionError({
          path: e.message?.includes('schedules') ? 'schedules' : 'bookings',
          operation: 'write',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message || "Could not complete your booking.",
          });
      }
    } finally {
        setIsReserving(false);
    }
  }

  const handleNewBooking = () => {
    form.reset();
    setStep('form');
    setConfirmedBooking(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares || isLoadingPorts || !isAuthReady || isUserLoading;
  const currentSchedule = filteredSchedules.find(s => s.id === watchScheduleId);
  const familyMembers = passengerData?.familyMembers || [];

  if (isLoading) {
    return (
        <div className="flex h-64 w-full flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground animate-pulse">Preparing your booking dashboard...</p>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
          {/* Progress Steps */}
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
              <CardContent className="pt-8">
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
                                    <FormLabel>From</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 border-2 hover:border-primary transition-all">
                                        <SelectValue placeholder={isLoadingPorts ? "Loading ports..." : "Choose Port"} />
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
                                    <FormLabel>To</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchDeparturePort}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 border-2 hover:border-primary transition-all">
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
                                    <Input type="date" {...field} min={dateRange.min} max={dateRange.max} disabled={!watchRouteId || !dateRange.min} className="h-12 border-2 hover:border-primary" />
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
                                        <SelectTrigger className="h-12 border-2 hover:border-primary transition-all">
                                        <SelectValue placeholder="Select a time" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredSchedules.map(schedule => (
                                            <SelectItem key={schedule.id} value={schedule.id}>
                                                {schedule.departureTime} - {schedule.arrivalTime} ({schedule.availableSeats > 0 ? `${schedule.availableSeats} seats left` : 'Waitlist available'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    {(!filteredSchedules || filteredSchedules.length === 0) && watchRouteId && watchTravelDate && (
                                        <p className="text-xs text-muted-foreground pt-1">No trips available for this date.</p>
                                    )}
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
                                    const userBirthDate = passengerData?.birthDate || '';
                                    append({ id: nanoid(), fullName: userName, birthDate: userBirthDate, fareType: "" });
                                }}
                                disabled={!watchScheduleId}
                                className="h-8"
                            >
                                <UserPlus className="mr-2 h-3.5 w-3.5" /> Me
                            </Button>
                            {familyMembers.length > 0 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" disabled={!watchScheduleId} className="h-8">
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
                        <div className="text-center py-12 px-4 border-2 border-dashed rounded-xl bg-muted/30">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-sm text-muted-foreground font-medium mb-4">Please add at least one passenger to continue.</p>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                                disabled={!watchScheduleId}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add First Passenger
                            </Button>
                        </div>
                        ) : (
                        <div className="grid gap-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-5 bg-card border-2 rounded-xl shadow-sm relative group hover:border-primary/50 transition-colors">
                                    <div className="sm:col-span-6 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`passengers.${index}.fullName`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Passenger {index + 1} Name</FormLabel>
                                                <FormControl>
                                                <Input placeholder="Legal Full Name" {...field} className="h-10 border-muted" />
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
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Birth Date</FormLabel>
                                                <FormControl>
                                                <Input type="date" {...field} className="h-10 border-muted" />
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
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 border-muted">
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
                                className="w-full h-12 border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                                onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                                disabled={!watchScheduleId}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Traveler
                            </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border">
                        <FormField
                            control={form.control}
                            name="primaryPhone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Emergency Contact Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 09171234567" {...field} className="h-11 bg-white" />
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
                                <FormLabel>Email for Itinerary</FormLabel>
                                <FormControl>
                                    <Input placeholder="you@example.com" {...field} className="h-11 bg-white" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold shadow-lg" disabled={!form.formState.isValid || totalSeats === 0}>
                      Proceed to Review
                    </Button>
                  </form>
                </Form>
              </CardContent>
            )}
            
            {step === 'summary' && (
              <>
                <CardContent className="pt-8 space-y-8">
                  <div className="bg-muted/30 p-6 rounded-2xl border-2 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="font-bold text-xl">{getRouteName(watchRouteId)}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {watchDeparturePort}
                            </p>
                        </div>
                        <div className="text-right space-y-1">
                            <Badge className="font-mono text-sm">
                                {watchTravelDate && isValid(new Date(watchTravelDate)) 
                                    ? format(new Date(watchTravelDate), 'PPP') 
                                    : '...'}
                            </Badge>
                            <p className="font-bold text-lg">{currentSchedule?.departureTime}</p>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Traveler Breakdown</h4>
                        {bookingSummary.details.map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-bold">{item.name}</p>
                                    <p className="text-muted-foreground text-xs uppercase tracking-tight">{item.fareType}</p>
                                </div>
                                <span className="font-bold font-mono">₱{item.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Grand Total</span>
                            <p className="text-xs text-muted-foreground">Incl. terminal fees & taxes</p>
                        </div>
                        <span className="text-4xl font-black tracking-tighter text-primary">₱{bookingSummary.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 px-2">
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                        By clicking "Reserve Now", you agree to Isla Konek's terms of service. Your seats will be held for 30 minutes pending payment at the terminal or via digital channels.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button variant="ghost" size="lg" className="w-full sm:w-auto h-12" onClick={() => setStep('form')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                    <Button onClick={() => handleFinalReserve(form.getValues())} size="lg" className="w-full h-12 flex-1 shadow-lg" disabled={isReserving}>
                        {isReserving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reserve Now
                    </Button>
                </CardFooter>
              </>
            )}

            {step === 'confirmation' && confirmedBooking && (
              <CardContent className="pt-8">
                <div className="border rounded-2xl p-2 bg-muted/10 shadow-inner">
                    <TripItinerary booking={confirmedBooking} />
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" size="lg" className="flex-1 h-12" onClick={handleNewBooking}>
                        <RefreshCw className="mr-2 h-4 w-4" /> New Booking
                    </Button>
                    <Button variant="default" size="lg" className="flex-1 h-12" onClick={() => router.push('/my-bookings')}>
                        View All Bookings
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
    <div className="flex min-h-screen flex-col bg-secondary/20">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-24">
            <Suspense fallback={
                <div className="flex h-64 w-full flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Preparing your booking dashboard...</p>
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
