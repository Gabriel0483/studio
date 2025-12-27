'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { BookCopy } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  passengerName: string;
  passengerEmail: string;
  routeName: string;
  bookingDate: Timestamp;
  numberOfSeats: number;
  totalPrice: number;
}

export default function BookingsPage() {
  const firestore = useFirestore();
  
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore]);

  const { data: bookings, isLoading } = useCollection<Omit<Booking, 'id'>>(bookingsQuery);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return format(timestamp.toDate(), "PPP p");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
        <p className="text-muted-foreground">View and manage all passenger bookings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>A real-time list of all passenger bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Booking Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading bookings...
                  </TableCell>
                </TableRow>
              ) : bookings && bookings.length > 0 ? (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.passengerName}</TableCell>
                    <TableCell>{booking.passengerEmail}</TableCell>
                    <TableCell>{booking.routeName}</TableCell>
                    <TableCell>{booking.numberOfSeats}</TableCell>
                    <TableCell>₱{booking.totalPrice?.toFixed(2) ?? '0.00'}</TableCell>
                    <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <BookCopy className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No bookings found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
