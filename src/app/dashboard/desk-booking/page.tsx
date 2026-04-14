'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, Trash2, ArrowLeft, RefreshCw, Loader2, UserSearch } from "lucide-react"

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
import { format, addDays } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary";
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"

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


export default function DeskBookingPage() {
  const firestore = useFirestore();
  const router = useRouter();
  
  const [step, setStep] = useState<'form' | 'summary' | 'confirmation'>('form');
  const [bookingSummary, setBookingSummary] = useState<BookingSummary>({ details: [], totalPrice: 0, totalTickets: 0 });
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [foundPassenger, setFoundPassenger] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'schedules');
  }, [firestore]);

  const routesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'routes');
  }, [firestore]);

  const faresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'fares');
  }, [firestore]);
  
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
      passengers: [{ id: nanoid(), fullName: "", birthDate: "", fareType: "" }],
      primaryEmail: "",
      primaryPhone: "",
      isPaid: false,
    },
  });

  useEffect(() => {
    const today = new Date();
    const sixtyDaysFromNow = addDays(today, 59);
    
    const minDate = format(today, "yyyy-MM-dd");
    const maxDate = format(sixtyDaysFromNow, "yyyy-MM-dd");
    
    setDateRange({ min: minDate, max: maxDate });
    form.setValue('travelDate', minDate);
  }, [form]);

  useEffect(() => {
    if (foundPassenger) {
        form.setValue('passengers', [{ id: foundPassenger.id, fullName: `${foundPassenger.firstName || ''} ${foundPassenger.lastName || ''}`.trim(), birthDate: foundPassenger.birthDate || "", fareType: "" }]);
        form.setValue('primaryEmail', foundPassenger.email || '');
        form.setValue('primaryPhone', foundPassenger.phone || '');
    } else {
        form.reset({
            ...form.getValues(),
            passengers: [{ id: nanoid(), fullName: '', birthDate: '', fareType: '' }],
            primaryEmail: '',
            primaryPhone: '',
        });
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

    const selectedDate = new Date(watchTravelDate);
    selectedDate.setHours(0, 0, 0, 0);
    const formattedTravelDate = format(selectedDate, 'yyyy-MM-dd');

    const specialTrips = allSchedules.filter(s => 
      s.tripType === 'Special' && 
      s.date === formattedTravelDate
    );

    const dailyTrips = allSchedules.filter(s => s.tripType === 'Daily' && s.routeId === watchRouteId);

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
          const spawnedScheduleQuery = query(
            collection(firestore, 'schedules'),
            where('sourceScheduleId', '==', scheduleId),
            where('date', '==', formattedTravelDate)
          );
          const spawnedSchedules = await getDocs(spawnedScheduleQuery);

          if (!spawnedSchedules.empty) {
            const spawnedDoc = spawnedSchedules.docs[0];
            scheduleToBookRef = spawnedDoc.ref;
            scheduleDataForUpdate = spawnedDoc.data();
          } else {
            scheduleToBookRef = doc(collection(firestore, 'schedules'));
            scheduleDataForUpdate = {
              ...selectedScheduleTemplate,
              tripType: 'Special',
              date: formattedTravelDate,
              sourceScheduleId: scheduleId,
              id: scheduleToBookRef.id
            };
            transaction.set(scheduleToBookRef, scheduleDataForUpdate);
          }
        } else {
          scheduleToBookRef = doc(firestore, 'schedules', scheduleId);
          const scheduleDoc = await transaction.get(scheduleToBookRef);
          if (!scheduleDoc.exists()) throw new Error("Selected schedule does not exist!");
          scheduleDataForUpdate = scheduleDoc.data();
        }

        const currentAvailableSeats = scheduleDataForUpdate.availableSeats || 0;
        let status: 'Reserved' | 'Waitlisted' | 'Confirmed';
        let paymentStatus: 'Paid' | 'Unpaid' = data.isPaid ? 'Paid' : 'Unpaid';

        if (currentAvailableSeats >= totalSeats) {
          const newAvailableSeats = currentAvailableSeats - totalSeats;
          transaction.update(scheduleToBookRef, { availableSeats: newAvailableSeats });
          status = data.isPaid ? 'Confirmed' : 'Reserved';
        } else {
          status = 'Waitlisted';
          paymentStatus = 'Unpaid';
        }
  
        const newBookingRef = doc(collection(firestore, 'bookings'));
        const newBookingId = generateBookingReference();
        const passengerId = foundPassenger ? foundPassenger.id : nanoid();
  
        const route = routes?.find(r => r.id === scheduleDataForUpdate.routeId);

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
          departurePortName: scheduleDataForUpdate.departurePortName || route?.departure || '',
          status: status,
          paymentStatus: paymentStatus,
          refundStatus: 'Not Applicable',
          paymentMethod: data.isPaid ? 'Cash' : 'Unpaid',
        };
  
        transaction.set(newBookingRef, newBookingData);
        return { status, bookingId: newBookingId, finalScheduleId: scheduleToBookRef.id };
      });
  
      toast({
        title: "Booking Successful!",
        description: `Booking is now ${bookingStatus}.`,
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
    setFoundPassenger(null);
    setSearchQuery('');
    setStep('form');
    setConfirmedBooking(null);
  };
  
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
            toast({ variant: 'destructive', title: 'Passenger Not Found', description: 'No passenger found with that email or phone. Proceed with manual entry.' });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Search Error', description: 'Could not perform passenger search.' });
    } finally {
        setIsSearching(false);
    }
  };

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares;
  const currentSchedule = filteredSchedules.find(s => s.id === watchScheduleId);

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
                {foundPassenger && (
                    <div className="text-sm text-green-600">
                        Found: {foundPassenger.firstName} {foundPassenger.lastName} ({foundPassenger.email})
                    </div>
                )}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "" })}
                    disabled={!watchScheduleId}
                  >
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
                            <FormLabel>Contact Email Address</FormLabel>
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
                        <FormDescription>
                          Mark this booking as paid and confirmed immediately.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
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
                    {form.getValues('isPaid') ? 'Confirm & Mark as Paid' : 'Reserve Now'}
                </Button>
            </CardFooter>
          </>
        )}

        {step === 'confirmation' && confirmedBooking && (
          <>
            <CardContent>
              <div className="p-4 sm:p-6 border rounded-lg">
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
  );
}
