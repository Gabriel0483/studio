
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookCopy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { useRouter } from 'next/navigation';

export default function MyBookingsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'bookings'), where('passengerId', '==', user.uid));
  }, [firestore, user]);

  const { data: bookings, isLoading } = useCollection(bookingsQuery);

  const sortedBookings = useMemo(() => {
    if (!bookings) return [];
    return [...bookings].sort((a, b) => b.bookingDate.toMillis() - a.bookingDate.toMillis());
  }, [bookings]);

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

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP');
  };

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
            ) : sortedBookings && sortedBookings.length > 0 ? (
              <div className="space-y-6">
                {sortedBookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-xl tracking-tight">{booking.routeName}</CardTitle>
                        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                      </div>
                      <CardDescription>Travel Date: {formatDate(booking.travelDate)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-muted-foreground">Booking Ref</p>
                          <p className="font-mono">{booking.id}</p>
                        </div>
                         <div>
                          <p className="font-semibold text-muted-foreground">Passengers</p>
                          <p>{booking.numberOfSeats}</p>
                        </div>
                         <div>
                          <p className="font-semibold text-muted-foreground">Total Price</p>
                          <p>₱{booking.totalPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Payment Status</p>
                          <Badge variant={booking.paymentStatus === 'Paid' ? 'default' : 'secondary'}>
                            {booking.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
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
