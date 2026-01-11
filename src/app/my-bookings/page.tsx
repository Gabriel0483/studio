
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, BookCopy, Ship, Users as UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

export default function MyBookingsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'bookings'), where('passengerId', '==', user.uid));
  }, [firestore, user]);

  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery, { idField: 'firestoreId' });
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);

  const enrichedBookings = useMemo(() => {
    if (!bookings || !schedules) return [];
    return bookings.map(booking => {
      const schedule = schedules.find(s => s.id === booking.scheduleId);
      return {
        ...booking,
        departureTime: schedule?.departureTime,
        arrivalTime: schedule?.arrivalTime,
        shipName: schedule?.shipName || 'TBA',
      };
    }).sort((a, b) => {
        const dateA = a.bookingDate ? a.bookingDate.toMillis() : 0;
        const dateB = b.bookingDate ? b.bookingDate.toMillis() : 0;
        return dateB - dateA;
    });
  }, [bookings, schedules]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Confirmed':
      case 'Reserved':
        return 'default';
      case 'Waitlisted':
        return 'secondary';
      case 'Cancelled':
      case 'Refunded':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (timestamp: Timestamp | undefined, dateFormat = 'PPP') => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), dateFormat);
  };
  
   const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A";
    try {
        const date = new Date(`1970-01-01T${timeString}`);
        return format(date, 'p');
    } catch {
        return "Invalid Time";
    }
  };

  const isLoading = isLoadingBookings || isLoadingSchedules;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-secondary">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Bookings</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                View your past and upcoming trips.
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading your bookings...</p>
              </div>
            ) : enrichedBookings && enrichedBookings.length > 0 ? (
              <div className="space-y-6">
                {enrichedBookings.map((booking) => (
                  <Card key={booking.firestoreId} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-xl tracking-tight">{booking.routeName}</CardTitle>
                            <CardDescription>Travel Date: {formatDate(booking.travelDate)}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(booking.status)} className="w-fit">{booking.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm sm:grid-cols-3">
                        <div>
                          <p className="font-semibold text-muted-foreground">Booking Ref</p>
                          <p className="font-mono">{booking.id}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Departure</p>
                          <p>{formatTime(booking.departureTime)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Arrival (Est.)</p>
                          <p>{formatTime(booking.arrivalTime)}</p>
                        </div>
                         <div>
                          <p className="font-semibold text-muted-foreground">Passengers</p>
                          <p>{booking.numberOfSeats}</p>
                        </div>
                         <div>
                          <p className="font-semibold text-muted-foreground">Ship</p>
                          <p className="flex items-center gap-2"><Ship className="h-4 w-4" /> {booking.shipName}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Payment</p>
                          <Badge variant={booking.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="mt-1">
                            {booking.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                       <Separator />
                       <div>
                            <p className="font-semibold text-muted-foreground flex items-center gap-2 mb-2"><UsersIcon className="h-4 w-4" /> Passengers</p>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {booking.passengerInfo?.map((p: any, i: number) => (
                                    <li key={i}>{p.fullName} <span className="text-muted-foreground">({p.fareType})</span></li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 px-6 py-3">
                         <div className="flex w-full items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Price</span>
                            <span className="font-bold text-lg">₱{booking.totalPrice.toFixed(2)}</span>
                        </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed">
                <BookCopy className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Bookings Found</h3>
                <p className="text-sm text-muted-foreground">You haven't made any bookings yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
