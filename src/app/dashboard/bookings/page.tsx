
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import {
  collection,
  Timestamp,
  doc,
  runTransaction,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { BookCopy, Pencil, Search, Trash2, CreditCard, Loader2, FilterX, Filter, MapPin, ShieldAlert, Zap, Eye, User, Calendar, Ship, Ticket, Users, Ghost, Clock, RotateCcw } from 'lucide-react';
import { format, isValid, isBefore, subHours } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Booking {
  firestoreId: string;
  id: string;
  scheduleId: string;
  passengerInfo?: { fullName: string; birthDate?: string; fareType?: string }[];
  fareDetails?: { passengerType: string; count: number; pricePerTicket: number }[];
  passengerEmail: string;
  passengerPhone?: string;
  routeName: string;
  departurePortName?: string;
  travelDate: Timestamp;
  bookingDate: Timestamp;
  status: 'Confirmed' | 'Reserved' | 'Waitlisted' | 'Cancelled' | 'Refunded' | 'Completed';
  paymentStatus: 'Paid' | 'Unpaid' | 'Refunded';
  numberOfSeats: number;
  totalPrice: number;
}

const bookingStatuses = ['Confirmed', 'Reserved', 'Waitlisted', 'Cancelled', 'Refunded', 'Completed', 'Ghost'] as const;

export default function BookingsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  
  const [search, setSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterSchedule, setFilterSchedule] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [isUnpaidDialogOpen, setIsUnpaidDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [bookingToProcess, setBookingToProcess] = useState<Booking | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const staffDocRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'staff', user.uid) : null, [firestore, user]);
  const { data: staffData, isLoading: isLoadingStaffData } = useDoc(staffDocRef);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || isLoadingStaffData || !user) return null;

    const isPlatformAdmin = (user.email === 'rielmagpantay@gmail.com' || user.email === 'mariel.dumaoal@gmail.com');
    const roles = staffData?.roles || [];
    
    if (!staffData && !isPlatformAdmin) return null;

    const isFullAccessRole = roles.some((r: string) => 
      ['Super Admin', 'Operations Manager', 'Finance/Accounting'].includes(r)
    ) || isPlatformAdmin;

    const baseCol = collection(firestore, 'bookings');

    if (isFullAccessRole) return baseCol;

    if (roles.includes('Desk Booking Agent') || roles.includes('Station Manager')) {
      if (staffData?.assignedPortName) {
        return query(baseCol, where('departurePortName', '==', staffData.assignedPortName));
      } else {
        return query(baseCol, where('departurePortName', '==', '__NO_ASSIGNED_PORT__'));
      }
    }

    return null;
  }, [firestore, staffData, isLoadingStaffData, user]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery, { idField: 'firestoreId' });
  const { data: routes } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]));
  const { data: schedules } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]));

  const isGhost = (booking: Booking) => {
    if (booking.status !== 'Reserved' || booking.paymentStatus !== 'Unpaid') return false;
    const schedule = schedules?.find(s => s.id === booking.scheduleId);
    if (!schedule) return false;

    const travelDate = booking.travelDate instanceof Timestamp ? booking.travelDate.toDate() : new Date(booking.travelDate);
    const [hours, minutes] = schedule.departureTime.split(':').map(Number);
    const departureTime = new Date(travelDate);
    departureTime.setHours(hours, minutes, 0, 0);

    const expiryThreshold = subHours(departureTime, 1);
    return isBefore(expiryThreshold, currentTime);
  };

  const expiredBookings = useMemo(() => {
    if (!bookings || !schedules) return [];
    return bookings.filter(isGhost);
  }, [bookings, schedules, currentTime]);

  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleCleanupExpired = async () => {
    if (!firestore || expiredBookings.length === 0) return;
    setIsCleaningUp(true);
    
    let successCount = 0;
    let indexMissing = false;

    try {
      for (const booking of expiredBookings) {
        const waitlistQuery = query(
          collection(firestore, 'bookings'),
          where('scheduleId', '==', booking.scheduleId),
          where('status', '==', 'Waitlisted'),
          orderBy('bookingDate', 'asc')
        );

        let waitlistSnap;
        try {
          waitlistSnap = await getDocs(waitlistQuery);
        } catch (e: any) {
          if (e.code === 'failed-precondition') {
            indexMissing = true;
          }
        }

        await runTransaction(firestore, async (transaction) => {
          const bookingRef = doc(firestore, 'bookings', booking.firestoreId);
          const scheduleRef = doc(firestore, 'schedules', booking.scheduleId);
          const scheduleDoc = await transaction.get(scheduleRef);
          
          if (!scheduleDoc.exists()) {
             transaction.delete(bookingRef);
             return;
          }

          let currentSeats = (scheduleDoc.data().availableSeats || 0) + booking.numberOfSeats;
          let currentWaitlistCount = scheduleDoc.data().waitlistCount || 0;

          if (waitlistSnap) {
            for (const wDoc of waitlistSnap.docs) {
              const wData = wDoc.data();
              if (wData.numberOfSeats <= currentSeats) {
                transaction.update(wDoc.ref, { status: 'Reserved' });
                currentSeats -= wData.numberOfSeats;
                currentWaitlistCount = Math.max(0, currentWaitlistCount - wData.numberOfSeats);
              }
            }
          }

          transaction.update(scheduleRef, { 
            availableSeats: currentSeats,
            waitlistCount: currentWaitlistCount
          });
          
          transaction.delete(bookingRef);
        });
        successCount++;
      }
      
      if (indexMissing) {
        toast({ 
          title: "Cleanup Partial", 
          description: `Deleted ${successCount} ghost records. Automatic waitlist promotion was skipped due to missing Firestore index.` 
        });
      } else {
        toast({ title: "Cleanup Complete", description: `Successfully purged ${successCount} ghost reservations.` });
      }
    } catch (error: any) {
      console.error("Cleanup failed:", error);
      toast({ variant: "destructive", title: "Cleanup Failed", description: error.message || "Could not complete cleanup." });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const availableSchedules = useMemo(() => {
    if (!schedules || !filterDate || !isValid(filterDate)) return [];
    const selectedDateStr = format(filterDate, 'yyyy-MM-dd');
    return schedules
      .filter(s => s.date === selectedDateStr || (s.tripType === 'Daily'))
      .sort((a,b) => a.departureTime.localeCompare(b.departureTime));
  }, [schedules, filterDate]);

  useEffect(() => {
    setFilterSchedule('all');
  }, [filterDate, filterRoute]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    
    const sortedBookings = [...bookings].sort((a, b) => {
        const dateA = a.bookingDate instanceof Timestamp ? a.bookingDate.toMillis() : 0;
        const dateB = b.bookingDate instanceof Timestamp ? b.bookingDate.toMillis() : 0;
        return dateB - dateA;
    });
    
    const selectedRoute = routes?.find(r => r.id === filterRoute);

    return sortedBookings.filter((booking) => {
      const searchTerm = search.toLowerCase();
      const passengerNames = Array.isArray(booking.passengerInfo) ? booking.passengerInfo.map(p => p.fullName.toLowerCase()).join(' ') : '';
      const searchMatch = !search ||
        passengerNames.includes(searchTerm) ||
        booking.id.toLowerCase().includes(searchTerm) ||
        booking.passengerEmail.toLowerCase().includes(searchTerm) ||
        booking.routeName.toLowerCase().includes(searchTerm);

      let statusMatch = filterStatus === 'all' || booking.status === filterStatus;
      if (filterStatus === 'Ghost') {
        statusMatch = isGhost(booking);
      }
      
      let dateMatch = true;
      if (filterDate && isValid(filterDate)) {
        const travelDate = booking.travelDate instanceof Timestamp ? booking.travelDate.toDate() : new Date(booking.travelDate);
        dateMatch = isValid(travelDate) && format(travelDate, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
      }

      const routeMatch = filterRoute === 'all' || booking.routeName === selectedRoute?.name;
      const scheduleMatch = filterSchedule === 'all' || booking.scheduleId === filterSchedule;

      return searchMatch && statusMatch && dateMatch && routeMatch && scheduleMatch;
    });
  }, [bookings, search, filterStatus, filterDate, filterRoute, filterSchedule, routes, schedules, currentTime]);
  
  const clearFilters = () => {
    setSearch('');
    setFilterRoute('all');
    setFilterStatus('all');
    setFilterDate(undefined);
    setFilterSchedule('all');
  };

  const formatDate = (timestamp: Timestamp | undefined, dateFormat = 'PPP p') => {
    if (!timestamp) return 'N/A';
    const dateObj = timestamp.toDate();
    return isValid(dateObj) ? format(dateObj, dateFormat) : 'Invalid Date';
  };

  const handleEdit = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}/edit`);
  };

  const handleDelete = async () => {
    if (!firestore || !bookingToProcess) return;
    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    const scheduleRef = doc(firestore, 'schedules', bookingToProcess.scheduleId);

    const waitlistQuery = query(
      collection(firestore, 'bookings'),
      where('scheduleId', '==', bookingToProcess.scheduleId),
      where('status', '==', 'Waitlisted'),
      orderBy('bookingDate', 'asc')
    );

    let waitlistSnap;
    try {
      waitlistSnap = await getDocs(waitlistQuery);
    } catch (e: any) {
      console.warn("Index missing for waitlist promotion. Skipping promotion.");
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const scheduleDoc = await transaction.get(scheduleRef);
        if (!scheduleDoc.exists()) {
          transaction.delete(bookingRef);
          return;
        }

        let currentSeats = scheduleDoc.data().availableSeats || 0;
        let currentWaitlistCount = scheduleDoc.data().waitlistCount || 0;

        if (bookingToProcess.status === 'Reserved' || bookingToProcess.status === 'Confirmed') {
          currentSeats += bookingToProcess.numberOfSeats;
          if (waitlistSnap) {
            for (const wDoc of waitlistSnap.docs) {
              const wData = wDoc.data();
              if (wData.numberOfSeats <= currentSeats) {
                transaction.update(wDoc.ref, { status: 'Reserved' });
                currentSeats -= wData.numberOfSeats;
                currentWaitlistCount = Math.max(0, currentWaitlistCount - wData.numberOfSeats);
              }
            }
          }
        } else if (bookingToProcess.status === 'Waitlisted') {
          currentWaitlistCount = Math.max(0, currentWaitlistCount - bookingToProcess.numberOfSeats);
        }

        transaction.update(scheduleRef, { 
          availableSeats: currentSeats,
          waitlistCount: currentWaitlistCount 
        });
        transaction.delete(bookingRef);
      });
      toast({ title: 'Booking Deleted', description: 'Booking removed successfully.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error Deleting Booking', description: e.message });
    } finally {
        setIsDeleteDialogOpen(false);
        setBookingToProcess(null);
    }
  };

  const handleCancel = async () => {
    if (!firestore || !bookingToProcess) return;
    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    const scheduleRef = doc(firestore, 'schedules', bookingToProcess.scheduleId);

    const waitlistQuery = query(
      collection(firestore, 'bookings'),
      where('scheduleId', '==', bookingToProcess.scheduleId),
      where('status', '==', 'Waitlisted'),
      orderBy('bookingDate', 'asc')
    );
    
    let waitlistSnap;
    try {
      waitlistSnap = await getDocs(waitlistQuery);
    } catch (e) {
      console.warn("Index missing, skipping promotion.");
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const scheduleDoc = await transaction.get(scheduleRef);
            if (!scheduleDoc.exists()) {
                transaction.update(bookingRef, { status: 'Cancelled' });
                return;
            }

            let currentSeats = scheduleDoc.data().availableSeats || 0;
            let currentWaitlistCount = scheduleDoc.data().waitlistCount || 0;

            if (bookingToProcess.status === 'Reserved' || bookingToProcess.status === 'Confirmed') {
                currentSeats += bookingToProcess.numberOfSeats;
                if (waitlistSnap) {
                    for (const wDoc of waitlistSnap.docs) {
                      const wData = wDoc.data();
                      if (wData.numberOfSeats <= currentSeats) {
                        transaction.update(wDoc.ref, { status: 'Reserved' });
                        currentSeats -= wData.numberOfSeats;
                        currentWaitlistCount = Math.max(0, currentWaitlistCount - wData.numberOfSeats);
                      }
                    }
                }
            } else if (bookingToProcess.status === 'Waitlisted') {
              currentWaitlistCount = Math.max(0, currentWaitlistCount - bookingToProcess.numberOfSeats);
            }

            transaction.update(scheduleRef, { 
              availableSeats: currentSeats,
              waitlistCount: currentWaitlistCount
            });
            transaction.update(bookingRef, { status: 'Cancelled' });
        });
        toast({ title: 'Booking Cancelled', description: 'Booking status updated and seats released.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error Cancelling Booking', description: e.message });
    } finally {
        setIsCancelDialogOpen(false);
        setBookingToProcess(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!firestore || !bookingToProcess) return;
    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    try {
      await updateDoc(bookingRef, { paymentStatus: 'Paid', status: 'Confirmed' });
      toast({ title: 'Booking Paid & Confirmed', description: `Booking #${bookingToProcess.id} is now Paid.` });
      if (isViewDialogOpen) {
        setBookingToProcess(prev => prev ? { ...prev, paymentStatus: 'Paid', status: 'Confirmed' } : null);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsPaidDialogOpen(false);
    }
  };

  const handleMarkAsUnpaid = async () => {
    if (!firestore || !bookingToProcess) return;
    const bookingRef = doc(firestore, 'bookings', bookingToProcess.firestoreId);
    try {
      await updateDoc(bookingRef, { paymentStatus: 'Unpaid', status: 'Reserved' });
      toast({ title: 'Payment Reverted', description: `Booking #${bookingToProcess.id} is now Unpaid.` });
      if (isViewDialogOpen) {
        setBookingToProcess(prev => prev ? { ...prev, paymentStatus: 'Unpaid', status: 'Reserved' } : null);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsUnpaidDialogOpen(false);
    }
  };

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed': case 'Completed': return 'default';
      case 'Reserved': return 'secondary';
      case 'Waitlisted': return 'outline';
      case 'Cancelled': case 'Refunded': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getPaymentStatusVariant = (status: Booking['paymentStatus']) => {
    switch (status) {
        case 'Paid': return 'default';
        case 'Unpaid': return 'secondary';
        case 'Refunded': return 'destructive';
        default: return 'outline';
    }
  };
  
  const isLoading = isLoadingBookings || isLoadingStaffData;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
            <p className="text-muted-foreground">
              View and manage all passenger bookings for the fleet.
            </p>
          </div>
          {staffData?.assignedPortName && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location: {staffData.assignedPortName}
            </Badge>
          )}
        </div>

        {expiredBookings.length > 0 && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/40 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="font-black text-lg">Administrative Action Required</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  System detected <strong>{expiredBookings.length}</strong> ghost reservations.
                </p>
                <p className="text-xs opacity-80 italic">Unpaid bookings within 1 hour of departure are blocking seat capacity.</p>
              </div>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={handleCleanupExpired} 
                disabled={isCleaningUp}
                className="font-bold shadow-sm"
              >
                {isCleaningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Purge All Expired & Release Seats
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Passenger Bookings</CardTitle>
                <CardDescription>
                  A real-time list of all bookings tied to the operation.
                </CardDescription>
              </div>
              <div className="flex w-full flex-col sm:w-auto sm:flex-row sm:items-center gap-2">
                <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    {isFilterOpen ? 'Hide' : 'Show'} Filters
                </Button>
                <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
                    <FilterX className="mr-2 h-4 w-4" />
                    Clear Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <Collapsible open={isFilterOpen}>
            <CollapsibleContent>
              <div className="border-t">
                  <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by name, email, or route..." className="pl-10 w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="filter-date">Travel Date</Label>
                            <Input
                                id="filter-date"
                                type="date"
                                value={filterDate && isValid(filterDate) ? format(filterDate, 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [year, month, day] = e.target.value.split('-').map(Number);
                                        setFilterDate(new Date(year, month - 1, day));
                                    } else {
                                        setFilterDate(undefined);
                                    }
                                }}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="filter-route">Route</Label>
                            <Select value={filterRoute} onValueChange={setFilterRoute}>
                                <SelectTrigger id="filter-route"><SelectValue placeholder="All Routes" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Routes</SelectItem>
                                    {routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="filter-status">Booking Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger id="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {bookingStatuses.map(s => (
                                      <SelectItem key={s} value={s} className={s === 'Ghost' ? "text-destructive font-bold" : ""}>
                                        {s === 'Ghost' ? 'Ghost Reservations' : s}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="filter-schedule">Schedule</Label>
                            <Select value={filterSchedule} onValueChange={setFilterSchedule} disabled={!filterDate}>
                                <SelectTrigger id="filter-schedule"><SelectValue placeholder="All Schedules" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Schedules</SelectItem>
                                    {availableSchedules.map(s => <SelectItem key={s.id} value={s.id}>{s.departureTime} - {s.arrivalTime}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                  </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow key="loading">
                        <TableCell colSpan={8} className="text-center h-24">
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
                            <div className="flex flex-col gap-1">
                              <Badge variant={getStatusVariant(booking.status)}>
                                  {booking.status}
                              </Badge>
                              {isGhost(booking) && (
                                <Badge variant="destructive" className="w-fit text-[10px] flex items-center gap-1 py-0 px-1 font-bold animate-pulse">
                                  <Ghost className="h-2 w-2" /> GHOST
                                </Badge>
                              )}
                            </div>
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
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => { setBookingToProcess(booking); setIsViewDialogOpen(true); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => { setBookingToProcess(booking); setIsPaidDialogOpen(true); }}
                                            disabled={booking.paymentStatus === 'Paid' || booking.status === 'Cancelled'}
                                        >
                                            <CreditCard className="h-4 w-4" />
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
                                            disabled={booking.status === 'Cancelled'}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() => { setBookingToProcess(booking); setIsDeleteDialogOpen(true); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow key="no-bookings">
                        <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <BookCopy className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No bookings found matching your search.</p>
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

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl flex flex-col h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BookCopy className="h-6 w-6 text-primary" />
              Booking #{bookingToProcess?.id}
            </DialogTitle>
            <DialogDescription>
              Comprehensive summary for reservation reference {bookingToProcess?.id}.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {bookingToProcess && (
                <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Voyage Details
                        </h4>
                        <p className="font-semibold text-lg">{bookingToProcess.routeName}</p>
                        <p className="text-sm text-muted-foreground">{bookingToProcess.departurePortName}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date of Travel
                        </h4>
                        <p className="text-sm font-medium">{formatDate(bookingToProcess.travelDate, 'PPP')}</p>
                    </div>
                    </div>
                    <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        <Ticket className="h-3 w-3" /> Booking Status
                        </h4>
                        <div className="flex gap-2">
                        <Badge variant={getStatusVariant(bookingToProcess.status)}>{bookingToProcess.status}</Badge>
                        <Badge variant={getPaymentStatusVariant(bookingToProcess.paymentStatus)}>{bookingToProcess.paymentStatus}</Badge>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Primary Contact
                        </h4>
                        <p className="text-sm font-medium">{bookingToProcess.passengerEmail}</p>
                        <p className="text-xs text-muted-foreground">{bookingToProcess.passengerPhone || 'No phone provided'}</p>
                    </div>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Users className="h-3 w-3" /> Passenger & Fare Breakdown
                  </h4>
                  <div className="bg-muted/30 rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="h-8 text-[10px] uppercase font-bold">Name</TableHead>
                          <TableHead className="h-8 text-[10px] uppercase font-bold text-center">Type</TableHead>
                          <TableHead className="h-8 text-[10px] uppercase font-bold text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingToProcess.passengerInfo?.map((p, i) => {
                          const fare = bookingToProcess.fareDetails?.find(f => f.passengerType === p.fareType);
                          return (
                            <TableRow key={i} className="hover:bg-transparent border-none">
                              <TableCell className="py-2 font-medium">{p.fullName}</TableCell>
                              <TableCell className="py-2 text-center">
                                <Badge variant="secondary" className="text-[10px] font-bold uppercase">{p.fareType || 'Standard'}</Badge>
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono">
                                ₱{fare?.pricePerTicket?.toFixed(2) || (bookingToProcess.totalPrice / bookingToProcess.numberOfSeats).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grand Total</p>
                    <p className="text-xs text-muted-foreground italic">Incl. all terminal fees</p>
                    </div>
                    <p className="text-3xl font-black tracking-tighter text-primary">₱{bookingToProcess.totalPrice.toFixed(2)}</p>
                </div>
                </div>
            )}
          </ScrollArea>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t bg-background">
            <Button variant="outline" className="flex-1" onClick={() => { setIsViewDialogOpen(false); handleEdit(bookingToProcess!.id); }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Details
            </Button>
            {bookingToProcess?.paymentStatus === 'Unpaid' && bookingToProcess?.status !== 'Cancelled' && (
              <Button className="flex-1" onClick={handleMarkAsPaid}>
                <CreditCard className="mr-2 h-4 w-4" /> Process Payment
              </Button>
            )}
            {bookingToProcess?.paymentStatus === 'Paid' && bookingToProcess?.status !== 'Completed' && (
              <Button variant="secondary" className="flex-1" onClick={() => setIsUnpaidDialogOpen(true)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Undo Payment
              </Button>
            )}
            <Button variant="secondary" className="sm:w-auto" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              booking and release the seats back into the schedule.
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
              This will cancel the booking and release the seats. The record will be kept for history.
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
              This will mark the booking as "Paid" and the status as "Confirmed".
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

      <AlertDialog open={isUnpaidDialogOpen} onOpenChange={setIsUnpaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Payment Status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the booking as "Unpaid" and return the status to "Reserved". Use this only to correct entry errors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsUnpaid}>
              Yes, Revert to Unpaid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
