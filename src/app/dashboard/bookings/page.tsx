'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  Timestamp,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { BookCopy, Pencil, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  scheduleId: string;
  passengerInfo?: { fullName: string; birthDate?: string }[];
  passengerEmail: string;
  passengerPhone: string;
  routeName: string;
  bookingDate: Timestamp;
  numberOfSeats: number;
  totalPrice: number;
}

export default function BookingsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore]);

  const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!search) return bookings;

    return bookings.filter((booking) => {
      const searchTerm = search.toLowerCase();
      const passengerNames = Array.isArray(booking.passengerInfo)
        ? booking.passengerInfo.map((p) => p.fullName.toLowerCase()).join(' ')
        : '';

      return (
        passengerNames.includes(searchTerm) ||
        booking.passengerEmail.toLowerCase().includes(searchTerm) ||
        booking.routeName.toLowerCase().includes(searchTerm)
      );
    });
  }, [bookings, search]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP p');
  };

  const handleEdit = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}/edit`);
  };

  const handleDelete = async (booking: Booking) => {
    if (
      !firestore ||
      !window.confirm(
        `Are you sure you want to delete this booking? This action cannot be undone.`
      )
    ) {
      return;
    }

    const bookingRef = doc(firestore, 'bookings', booking.id);
    const scheduleRef = doc(firestore, 'schedules', booking.scheduleId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const scheduleDoc = await transaction.get(scheduleRef);

        if (scheduleDoc.exists()) {
          const currentSeats = scheduleDoc.data().availableSeats || 0;
          const newSeats = currentSeats + booking.numberOfSeats;
          transaction.update(scheduleRef, { availableSeats: newSeats });
        }
        
        transaction.delete(bookingRef);
      });

      toast({
        title: 'Booking Deleted',
        description: 'The booking has been successfully deleted and seats have been returned.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Error Deleting Booking',
        description: e.message || 'There was a problem deleting the booking.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
        <p className="text-muted-foreground">
          View and manage all passenger bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            A real-time list of all passenger bookings.
          </CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by passenger name, email, or route..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger(s)</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading bookings...
                  </TableCell>
                </TableRow>
              ) : filteredBookings && filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {Array.isArray(booking.passengerInfo)
                        ? booking.passengerInfo.map((p) => p.fullName).join(', ')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>{booking.passengerEmail}</div>
                      <div>{booking.passengerPhone}</div>
                    </TableCell>
                    <TableCell>{booking.routeName}</TableCell>
                    <TableCell>{booking.numberOfSeats}</TableCell>
                    <TableCell>
                      ₱{booking.totalPrice?.toFixed(2) ?? '0.00'}
                    </TableCell>
                    <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(booking.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(booking)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
