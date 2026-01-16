
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft, RefreshCw, UserPlus, Loader2 } from "lucide-react"

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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction, Timestamp, where, query, getDocs, addDoc, getDoc, updateDoc } from "firebase/firestore"
import React, { useMemo, useState, useEffect, useRef } from "react"
import { Separator } from "@/components/ui/separator"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { format, addDays } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { nanoid } from "nanoid"

const passengerSchema = z.object({
  id: z.string(),
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
  status: 'Reserved' | 'Waitlisted';
  routeName: string;
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

export default function BookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const itineraryRef = useRef<HTMLDivElement>(null);
  
  const [step, setStep] = useState<'form' | 'summary' | 'confirmation'>('form');
  const [bookingSummary, setBookingSummary] = useState<BookingSummary>({ details: [], totalPrice: 0, totalTickets: 0 });
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [isReserving, setIsReserving] = useState(false);

  const passengerDocRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'passengers', user.uid) : null, [firestore, user]);
  const { data: passengerData } = useDoc(passengerDocRef);

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresQuery = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresQuery);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  
  const maxDate = new Date();
  maxDate.setDate(new Date().getDate() + 5);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: new Date().toISOString().split("T")[0],
      scheduleId: "",
      passengers: [{ id: nanoid(), fullName: user?.displayName || "", birthDate: "", fareType: "" }],
      primaryEmail: user?.email || "",
      primaryPhone: "",
    },
  });

  useEffect(() => {
    if (user && passengerData) {
        form.setValue('passengers', [{ id: nanoid(), fullName: `${passengerData.firstName || ''} ${passengerData.lastName || ''}`.trim(), birthDate: passengerData.birthDate || "", fareType: "" }]);
        form.setValue('primaryEmail', passengerData.email || user.email || '');
        form.setValue('primaryPhone', passengerData.phone || '');
    } else if (user) {
        form.setValue('passengers', [{ id: nanoid(), fullName: user.displayName || "", birthDate: "", fareType: "" }]);
        form.setValue('primaryEmail', user.email || '');
    }
  }, [user, passengerData, form]);

  const { fields, append, remove, replace } = useFieldArray({
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
    selectedDate.setHours(0, 0, 0, 0);
    const formattedTravelDate = format(selectedDate, 'yyyy-MM-dd');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = selectedDate.getTime() === today.getTime();
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get special trips for the selected date
    const specialTrips = allSchedules.filter(s => 
      s.tripType === 'Special' && 
      s.routeId === watchRouteId && 
      s.date === formattedTravelDate &&
      (!isToday || s.departureTime > currentTime)
    );

    // Get daily trips
    const dailyTrips = allSchedules.filter(s => s.tripType === 'Daily' && s.routeId === watchRouteId && (!isToday || s.departureTime > currentTime));

    // For daily trips, find if a special instance for today already exists
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
    const formattedTravelDate = format(travelDateObj, 'yyyy-MM-dd');
  
    try {
      const { status: bookingStatus, bookingId, finalScheduleId } = await runTransaction(firestore, async (transaction) => {
        let scheduleToBookRef: any;
        let scheduleDataForUpdate: any;

        const selectedScheduleTemplate = allSchedules.find(s => s.id === scheduleId);
        if (!selectedScheduleTemplate) throw new Error("Selected schedule template is invalid.");

        if (selectedScheduleTemplate.tripType === 'Daily') {
          // It's a daily trip, we need to find or create a special instance for today
          const spawnedScheduleQuery = query(
            collection(firestore, 'schedules'),
            where('sourceScheduleId', '==', scheduleId),
            where('date', '==', formattedTravelDate)
          );
          const spawnedSchedules = await getDocs(spawnedScheduleQuery); // Use getDocs, not transaction.get on a query

          if (!spawnedSchedules.empty) {
            // An instance for today already exists, use it
            const spawnedDoc = spawnedSchedules.docs[0];
            scheduleToBookRef = spawnedDoc.ref;
            scheduleDataForUpdate = spawnedDoc.data();
          } else {
            // No instance for today, create one
            scheduleToBookRef = doc(collection(firestore, 'schedules'));
            scheduleDataForUpdate = {
              ...selectedScheduleTemplate,
              tripType: 'Special',
              date: formattedTravelDate,
              sourceScheduleId: scheduleId,
              id: scheduleToBookRef.id // ensure new instance has its own ID
            };
            // Set the new doc in the transaction
            transaction.set(scheduleToBookRef, scheduleDataForUpdate);
          }
        } else {
          // It's already a special trip
          scheduleToBookRef = doc(firestore, 'schedules', scheduleId);
          const scheduleDoc = await transaction.get(scheduleToBookRef);
          if (!scheduleDoc.exists()) throw new Error("Selected schedule does not exist!");
          scheduleDataForUpdate = scheduleDoc.data();
        }

        const currentAvailableSeats = scheduleDataForUpdate.availableSeats || 0;
        let status: 'Reserved' | 'Waitlisted' = 'Reserved';

        if (currentAvailableSeats >= totalSeats) {
          const newAvailableSeats = currentAvailableSeats - totalSeats;
          transaction.update(scheduleToBookRef, { availableSeats: newAvailableSeats });
        } else {
          status = 'Waitlisted';
        }
  
        const newBookingRef = doc(collection(firestore, 'bookings'));
        const newBookingId = generateBookingReference();
  
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
          scheduleId: scheduleToBookRef.id,
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
          status: status,
          paymentStatus: 'Unpaid',
          refundStatus: 'Not Applicable',
          paymentMethod: 'Cash',
        };
  
        transaction.set(newBookingRef, newBookingData);
        return { status, bookingId: newBookingId, finalScheduleId: scheduleToBookRef.id };
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
        description: `Your booking is now ${bookingStatus}. Check your itinerary for details.`,
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
        departureTime: currentSchedule?.departureTime,
        arrivalTime: currentSchedule?.arrivalTime,
        totalPrice: summary.totalPrice,
      });
  
      setStep('confirmation');
  
    } catch (e: any) {
      console.error(e);
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

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares;
  const currentSchedule = filteredSchedules.find(s => s.id === watchScheduleId);
  const familyMembers = passengerData?.familyMembers || [];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
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
              <CardContent>
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
                                  <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} max={maxDateStr} disabled={!watchRouteId} />
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
                        <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 border rounded-lg relative">
                          <div className="sm:col-span-12">
                            <p className="font-semibold text-md">Passenger {index + 1}</p>
                          </div>
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
                                            <SelectValue placeholder={isLoadingFares ? "Loading..." : "Select fare"} />
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
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                          disabled={!watchScheduleId}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Passenger
                        </Button>
                        {familyMembers.length > 0 && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="secondary" size="sm" disabled={!watchScheduleId}>
                                        <UserPlus className="mr-2 h-4 w-4" /> Add Family Member
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Select Family Member</h4>
                                            <p className="text-sm text-muted-foreground">Click to add a family member to this booking.</p>
                                        </div>
                                        <div className="grid gap-2">
                                        {familyMembers.map((member: any) => (
                                            <div key={member.id} className="grid grid-cols-3 items-center gap-4">
                                                <span className="col-span-2 truncate">{member.fullName}</span>
                                                <Button size="sm" onClick={() => append({ id: member.id, fullName: member.fullName, birthDate: member.birthDate, fareType: '' })}>
                                                    Add
                                                </Button>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                      </div>
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
                      Submit Booking
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
                        <p className="text-muted-foreground">Date &amp; Time</p>
                        <p className="font-medium">
                          {format(new Date(watchTravelDate), 'PPP')} at {currentSchedule?.departureTime}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Passenger &amp; Fare Breakdown</h3>
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
                   <div className="text-sm text-muted-foreground">
                      Contact: {form.getValues('primaryEmail')} | {form.getValues('primaryPhone')}
                    </div>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setStep('form')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                    <Button onClick={() => handleFinalReserve(form.getValues())} size="lg" className="w-full sm:w-auto flex-1" disabled={isReserving}>
                        {isReserving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reserve Now
                    </Button>
                </CardFooter>
              </>
            )}

            {step === 'confirmation' && confirmedBooking && (
              <>
                <CardContent>
                  <div ref={itineraryRef} className="p-4 sm:p-6">
                    <TripItinerary booking={confirmedBooking} />
                  </div>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={handleNewBooking}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Make Another Booking
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

    