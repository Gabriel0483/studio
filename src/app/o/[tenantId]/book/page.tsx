'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft, RefreshCw, UserPlus, Loader2, Users, Info } from "lucide-react"

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
import { format, addDays, isValid } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { nanoid } from "nanoid"
import { useRouter, useParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

type ConfirmedBooking = BookingFormData & {
  id: string;
  bookingDate: Date;
  status: 'Reserved' | 'Waitlisted' | 'Confirmed';
  routeName: string;
  departurePortName: string;
  departureTime: string;
  arrivalTime: string;
  totalPrice: number;
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
        router.replace(`/login?redirect=/book`);
    }
  }, [isAuthReady, isUserLoading, user, router]);

  const passengerDocRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'passengers', user.uid) : null, [firestore, user]);
  const { data: passengerData } = useDoc(passengerDocRef);

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresQuery = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
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
    // Restriction: Only allow booking 7 days in advance
    const restrictedLimit = addDays(today, 6); 
    const minDate = format(today, "yyyy-MM-dd");
    const maxDate = format(restrictedLimit, "yyyy-MM-dd");
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
  
  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');

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
      // 1. Determine the target document ID for the schedule (lookup outside transaction)
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
          targetScheduleId = doc(collection(firestore, 'schedules')).id;
        }
      }

      // 2. Perform atomic read/writes
      const { status: bookingStatus, bookingId, finalScheduleId } = await runTransaction(firestore, async (transaction) => {
        const scheduleRef = doc(firestore, 'schedules', targetScheduleId);
        const scheduleSnap = await transaction.get(scheduleRef);
        
        let scheduleDataForUpdate;
        if (!scheduleSnap.exists()) {
          scheduleDataForUpdate = {
            ...selectedScheduleTemplate,
            tripType: 'Special',
            date: formattedTravelDate,
            sourceScheduleId: scheduleId,
            id: targetScheduleId,
          };
          transaction.set(scheduleRef, scheduleDataForUpdate);
        } else {
          scheduleDataForUpdate = scheduleSnap.data();
        }

        const currentAvailableSeats = scheduleDataForUpdate.availableSeats || 0;
        let status: 'Reserved' | 'Waitlisted' = 'Reserved';

        if (currentAvailableSeats >= totalSeats) {
          const newAvailableSeats = currentAvailableSeats - totalSeats;
          transaction.update(scheduleRef, { availableSeats: newAvailableSeats });
        } else {
          status = 'Waitlisted';
        }
  
        const newBookingRef = doc(collection(firestore, 'bookings'));
        const newBookingId = generateBookingReference();
        const route = routes?.find(r => r.id === scheduleDataForUpdate.routeId);
  
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
          routeName: getRouteName(scheduleDataForUpdate.routeId),
          departurePortName: scheduleDataForUpdate.departurePortName || route?.departure || '',
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
        ...data,
        scheduleId: finalScheduleId,
        id: bookingId,
        bookingDate: new Date(),
        status: bookingStatus,
        routeName: getRouteName(watchRouteId),
        departurePortName: currentSchedule?.departurePortName,
        departureTime: currentSchedule?.departureTime,
        arrivalTime: currentSchedule?.arrivalTime,
        totalPrice: summary.totalPrice,
      });
  
      setStep('confirmation');
  
    } catch (e: any) {
      console.error("Booking transaction failed:", e);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: e.message || "Could not complete your booking.",
      });
    } finally {
        setIsReserving(false);
    }
  }

  const handleNewBooking = () => {
    form.reset();
    setStep('form');
    setConfirmedBooking(null);
  };

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares || !isAuthReady || isUserLoading;
  const familyMembers = passengerData?.familyMembers || [];

  if (isLoading) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your session...</p>
        </div>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold tracking-tight">
          {step === 'form' && 'Book Your Seat Online'}
          {step === 'summary' && 'Your Trip Itinerary'}
          {step === 'confirmation' && 'Booking Confirmed!'}
        </CardTitle>
        <CardDescription>
          {step === 'form' && "Fill in the details below to complete your reservation."}
          {step === 'summary' && "Please review your trip itinerary before confirming your booking."}
          {step === 'confirmation' && "Your booking is complete. You can view your itinerary below."}
        </CardDescription>
      </CardHeader>
      
      {step === 'form' && (
        <CardContent className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 font-bold">Booking Window Restricted</AlertTitle>
            <AlertDescription className="text-blue-700">
                Online reservations are currently limited to trips departing within the next 7 days.
            </AlertDescription>
          </Alert>

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
                              <SelectTrigger disabled={isLoadingRoutes}>
                                <SelectValue placeholder={isLoadingRoutes ? "Loading routes..." : "Select a route"} />
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
                            <Input type="date" {...field} min={dateRange.min} max={dateRange.max} disabled={!watchRouteId || !dateRange.min} />
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
                                  {schedule.departureTime} - {schedule.arrivalTime} ({schedule.availableSeats > 0 ? `${schedule.availableSeats} seats left` : 'Waitlist available'})
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
                      <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                          className="w-full"
                      >
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                    disabled={!watchScheduleId}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Passenger
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const userName = (passengerData?.firstName && passengerData?.lastName) ? `${passengerData.firstName} ${passengerData.lastName}`.trim() : user?.displayName || '';
                      append({ id: nanoid(), fullName: userName, birthDate: passengerData?.birthDate || '', fareType: "" });
                    }}
                    disabled={!watchScheduleId}
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Add Myself
                  </Button>
                  {familyMembers.length > 0 && (
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button type="button" variant="secondary" size="sm" disabled={!watchScheduleId}>
                                  <Users className="mr-2 h-4 w-4" /> Add Family
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                              <div className="grid gap-2">
                                  {familyMembers.map((member: any) => (
                                      <Button key={member.id} variant="ghost" className="justify-start text-left" onClick={() => append({ id: member.id, fullName: member.fullName, birthDate: member.birthDate, fareType: '' })}>
                                          {member.fullName}
                                      </Button>
                                  ))}
                              </div>
                          </PopoverContent>
                      </Popover>
                  )}
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={totalSeats === 0}>
                Confirm Trip Details
              </Button>
            </form>
          </Form>
        </CardContent>
      )}
      
      {step === 'summary' && (
        <>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Price</span>
                <span>₱{bookingSummary.totalPrice.toFixed(2)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
                <p>Route: {getRouteName(watchRouteId)}</p>
                <p>Date: {watchTravelDate && isValid(new Date(watchTravelDate)) ? format(new Date(watchTravelDate), 'PPP') : '...'}</p>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('form')}>Edit</Button>
              <Button onClick={() => handleFinalReserve(form.getValues())} className="flex-1" disabled={isReserving}>
                  {isReserving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Reservation'}
              </Button>
          </CardFooter>
        </>
      )}

      {step === 'confirmation' && confirmedBooking && (
        <CardContent>
          <TripItinerary booking={confirmedBooking} />
          <Button variant="outline" className="w-full mt-6" onClick={handleNewBooking}>New Booking</Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function BookingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
            <Suspense fallback={
                <div className="flex h-64 w-full flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading...</p>
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
