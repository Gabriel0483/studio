
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  Timestamp,
  doc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { BookCopy, Pencil, Search, Trash2, XCircle, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface Booking {
  firestoreId: string; // The actual firestore document ID
  id: string; // The 6-digit booking reference
  scheduleId: string;
  passengerInfo?: { fullName: string; birthDate?: string }[];
  passengerEmail: string;
  routeName: string;
  travelDate: Timestamp;
  bookingDate: Timestamp;
  numberOfSeats: number;
  totalPrice: number;
  status: 'Confirmed' | 'Reserved' | 'Waitlisted' | 'Cancelled' | 'Refunded' | 'Completed';
  paymentStatus: 'Paid' | 'Unpaid' | 'Refunded';
}


export default function BookingsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [bookingToProcess, setBookingToProcess] = useState<Booking | null>(null);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery, { idField: 'firestoreId' });

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    
    const sortedBookings = [...bookings].sort((a, b) => {
        const dateA = a.bookingDate ? a.bookingDate.toMillis() : 0;
        const dateB = b.bookingDate ? b.bookingDate.toMillis() : 0;
        return dateB - dateA;
    });
    
    if (!search) return sortedBookings;

    return sortedBookings.filter((booking) => {
      const searchTerm = search.toLowerCase();
      const passengerNames = Array.isArray(booking.passengerInfo)
        ? booking.passengerInfo.map((p) => p.fullName.toLowerCase()).join(' ')
        : '';

      return (
        passengerNames.includes(searchTerm) ||
        booking.id.toLowerCase().includes(searchTerm) ||
        booking.passengerEmail.toLowerCase().includes(searchTerm) ||
        booking.routeName.toLowerCase().includes(searchTerm)
      );
    });
  }, [bookings, search]);

  const formatDate = (timestamp: Timestamp | undefined, dateFormat = 'PPP p') => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), dateFormat);
  };

  const handleEdit = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}/edit`);
  };

  const confirmDelete = (booking: Booking) => {
    setBookingToProcess(booking);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmCancel = (booking: Booking) => {
    if (booking.status === 'Cancelled' || booking.status === 'Refunded' || booking.status === 'Completed') {
      toast({
        variant: 'destructive',
        title: 'Already Finalized',
        description: 'This booking has already been cancelled, refunded, or completed.',
      });
      return;
    }
    setBookingToProcess(booking);
    setIsCancelDialogOpen(true);
  };
  
  const confirmPaid = (booking: Booking) => {
    if (booking.paymentStatus === 'Paid') {
        toast({
            title: 'Already Paid',
            description: 'This booking has already been marked as paid.',
        });
        return;
    }
    if (booking.status === 'Cancelled' || booking.status === 'Refunded' || booking.status === 'Completed') {
        toast({
            variant: 'destructive',
            title: 'Cannot Pay',
            description: 'This booking has been cancelled, refunded, or completed.',
        });
        return;
    }
    setBookingToProcess(booking);
    setIsPaidDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !bookingToProcess) {
      return;
    }

    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    const scheduleRef = doc(firestore, 'schedules', bookingToProcess.scheduleId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const scheduleDoc = await transaction.get(scheduleRef);

        if (scheduleDoc.exists() && (bookingToProcess.status === 'Reserved' || bookingToProcess.status === 'Confirmed')) {
          const currentSeats = scheduleDoc.data().availableSeats || 0;
          const newSeats = currentSeats + bookingToProcess.numberOfSeats;
          transaction.update(scheduleRef, { availableSeats: newSeats });
        }
        
        transaction.delete(bookingRef);
      });

      toast({
        title: 'Booking Deleted',
        description: 'The booking has been permanently deleted and seats have been returned.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Error Deleting Booking',
        description: e.message || 'There was a problem deleting the booking.',
      });
    } finally {
        setIsDeleteDialogOpen(false);
        setBookingToProcess(null);
    }
  };

  const handleCancel = async () => {
    if (!firestore || !bookingToProcess) {
        return;
    }

    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    const scheduleRef = doc(firestore, 'schedules', bookingToProcess.scheduleId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const scheduleDoc = await transaction.get(scheduleRef);

            // Only return seats if the booking was reserved or confirmed
            if (scheduleDoc.exists() && (bookingToProcess.status === 'Reserved' || bookingToProcess.status === 'Confirmed')) {
                const currentSeats = scheduleDoc.data().availableSeats || 0;
                const newSeats = currentSeats + bookingToProcess.numberOfSeats;
                transaction.update(scheduleRef, { availableSeats: newSeats });
            }

            transaction.update(bookingRef, { status: 'Cancelled' });
        });

        toast({
            title: 'Booking Cancelled',
            description: 'The booking has been successfully cancelled.',
        });

    } catch (e: any) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: 'Error Cancelling Booking',
            description: e.message || 'There was a problem cancelling the booking.',
        });
    } finally {
        setIsCancelDialogOpen(false);
        setBookingToProcess(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!firestore || !bookingToProcess) {
      return;
    }
    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    try {
      await updateDoc(bookingRef, { paymentStatus: 'Paid', status: 'Confirmed' });
      toast({
        title: 'Booking Paid & Confirmed',
        description: `Booking #${bookingToProcess.id} is now Paid and Confirmed.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message || 'Could not mark the booking as paid.',
      });
    } finally {
      setIsPaidDialogOpen(false);
      setBookingToProcess(null);
    }
  };

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed':
      case 'Completed':
        return 'default';
      case 'Reserved':
        return 'secondary';
      case 'Waitlisted':
        return 'outline';
      case 'Cancelled':
      case 'Refunded':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const getPaymentStatusVariant = (status: Booking['paymentStatus']) => {
    switch (status) {
        case 'Paid':
            return 'default';
        case 'Unpaid':
            return 'secondary';
        case 'Refunded':
             return 'destructive';
        default:
            return 'outline';
    }
  };
  
  const isLoading = isLoadingBookings;

  return (
    <>
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
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or route..."
                  className="pl-10 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Passenger(s)</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Travel Date</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow key="loading">
                        <TableCell colSpan={10} className="text-center h-24">
                          <div className="flex items-center justify-center">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Loading bookings...
                          </div>
                        </TableCell>
                    </TableRow>
                    ) : filteredBookings && filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                        <TableRow key={booking.firestoreId}>
                        <TableCell className="font-mono">{booking.id}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                            {Array.isArray(booking.passengerInfo)
                            ? booking.passengerInfo.map((p) => p.fullName).join(', ')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{booking.routeName}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(booking.status)}>
                                {booking.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getPaymentStatusVariant(booking.paymentStatus || 'Unpaid')}>
                                {booking.paymentStatus || 'Unpaid'}
                            </Badge>
                        </TableCell>
                        <TableCell>{booking.numberOfSeats}</TableCell>
                        <TableCell>
                            ₱{booking.totalPrice?.toFixed(2) ?? '0.00'}
                        </TableCell>
                        <TableCell>{formatDate(booking.travelDate, 'PPP')}</TableCell>
                        <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => confirmPaid(booking)}
                                            disabled={booking.paymentStatus === 'Paid' || booking.status === 'Cancelled' || booking.status === 'Refunded' || booking.status === 'Completed'}
                                        >
                                            <CreditCard className="h-4 w-4" />
                                            <span className="sr-only">Mark as Paid</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mark as Paid</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(booking.id)}
                                            disabled={booking.status === 'Cancelled' || booking.status === 'Refunded' || booking.status === 'Completed'}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Edit</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Booking</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => confirmCancel(booking)}
                                            disabled={booking.status === 'Cancelled' || booking.status === 'Refunded' || booking.status === 'Completed'}
                                        >
                                            <XCircle className="h-4 w-4" />
                                            <span className="sr-only">Cancel</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel Booking</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => confirmDelete(booking)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Booking</TooltipContent>
                                </Tooltip>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow key="no-bookings">
                        <TableCell colSpan={10} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <BookCopy className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No bookings found.</p>
                        </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              booking and release the seats back into the schedule if the booking was reserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking Cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking and change its status to "Cancelled". If the booking was reserved, the seats will be returned to the schedule. The booking record will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the booking as "Paid" and the status as "Confirmed". This action can be reversed by editing the booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid}>
              Mark as Paid & Confirmed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    