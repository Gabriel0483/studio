'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { User } from "lucide-react"

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
import React, { useMemo } from "react"

const bookingFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  numberOfSeats: z.coerce.number().int().min(1, { message: "At least one passenger is required." }),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
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

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      numberOfSeats: 1,
    },
  });

  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  async function onSubmit(data: z.infer<typeof bookingFormSchema>) {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not connect. Please try again later.' });
        return;
    }
  
    const { scheduleId, numberOfSeats } = data;
    const scheduleRef = doc(firestore, 'schedules', scheduleId);
    const newBookingRef = doc(collection(firestore, 'bookings'));

    try {
        await runTransaction(firestore, async (transaction) => {
            const scheduleDoc = await transaction.get(scheduleRef);
            if (!scheduleDoc.exists()) {
                throw new Error("Schedule does not exist!");
            }

            const scheduleData = scheduleDoc.data();
            const newAvailableSeats = scheduleData.availableSeats - numberOfSeats;
            if (newAvailableSeats < 0) {
                throw new Error("Not enough seats available.");
            }

            const relevantFare = fares?.find(f => f.routeId === scheduleData.routeId && f.passengerType === 'Adult');
            if(!relevantFare){
                throw new Error("Could not calculate total price, no Adult fare found for this route.");
            }
            const totalPrice = (relevantFare.price || 0) * numberOfSeats;

            transaction.update(scheduleRef, { availableSeats: newAvailableSeats });

            const bookingData = {
                id: newBookingRef.id,
                passengerId: user.uid,
                passengerName: data.fullName,
                passengerEmail: data.email,
                scheduleId,
                fareId: relevantFare.id,
                bookingDate: serverTimestamp(),
                numberOfSeats,
                totalPrice,
                routeName: getRouteName(scheduleData.routeId),
            };

            transaction.set(newBookingRef, bookingData);
        });

        toast({
            title: "Booking Successful!",
            description: `Your booking has been confirmed.`,
        });
        form.reset();

    } catch (e: any) {
        if (e.message.includes('permission-denied') || e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: newBookingRef.path,
                operation: 'create',
                requestResourceData: { ...data, passengerId: user.uid },
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: e.message || "Could not complete your booking.",
            });
        }
    }
  }

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <Card className="mx-auto max-w-2xl">
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
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
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
                      name="email"
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
                    name="scheduleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Route & Schedule</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="numberOfSeats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Passengers</FormLabel>
                          <FormControl>
                            <div className="relative">
                               <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                               <Input type="number" placeholder="1" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full">
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
