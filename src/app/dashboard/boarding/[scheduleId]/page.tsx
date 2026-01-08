'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, UserCheck, UserX, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export default function BoardingManifestPage() {
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const scheduleId = params.scheduleId as string;

  const scheduleRef = useMemoFirebase(() => {
    if (!firestore || !scheduleId) return null;
    return doc(firestore, 'schedules', scheduleId);
  }, [firestore, scheduleId]);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !scheduleId) return null;
    return query(collection(firestore, 'bookings'), where('scheduleId', '==', scheduleId));
  }, [firestore, scheduleId]);

  const boardingRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !scheduleId) return null;
    return query(collection(firestore, 'boarding'), where('scheduleId', '==', scheduleId));
  }, [firestore, scheduleId]);
  
  const { data: schedule, isLoading: isLoadingSchedule } = useDoc(scheduleRef);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(boardingRecordsQuery);
  const { data: route, isLoading: isLoadingRoute } = useDoc(useMemoFirebase(() => (firestore && schedule?.routeId) ? doc(firestore, 'routes', schedule.routeId) : null, [firestore, schedule]));

  const passengers = useMemo(() => {
    if (!bookings) return [];
    
    return bookings
      .filter(booking => booking.status === 'Reserved')
      .flatMap(booking => 
        (booking.passengerInfo || []).map((p: any, index: number) => {
          const uniquePassengerId = `${booking.id}-${index}`;
          const boardingRecord = boardingRecords?.find(br => br.passengerId === uniquePassengerId);
          return {
            ...p,
            id: uniquePassengerId,
            bookingId: booking.id,
            bookingStatus: booking.status,
            boardingStatus: boardingRecord?.status || 'Awaiting',
            boardingRecordId: boardingRecord?.id,
          };
        })
      );
  }, [bookings, boardingRecords]);

  const handleBoarding = useCallback((passenger: typeof passengers[0]) => {
    if (!firestore) return;
    const boardingCol = collection(firestore, 'boarding');
    addDocumentNonBlocking(boardingCol, {
        passengerId: passenger.id,
        passengerName: passenger.fullName,
        bookingId: passenger.bookingId,
        scheduleId,
        status: 'Boarded',
        boardingTime: serverTimestamp()
    });
    toast({ title: "Passenger Boarded", description: `${passenger.fullName} has been marked as boarded.` });
  }, [firestore, scheduleId, toast]);

  const handleDeboarding = useCallback((passenger: typeof passengers[0]) => {
    if (!firestore || !passenger.boardingRecordId) return;
    const boardingRef = doc(firestore, 'boarding', passenger.boardingRecordId);
    deleteDocumentNonBlocking(boardingRef);
    toast({ title: "Passenger Deboarded", description: `${passenger.fullName}'s boarding status has been reset.` });
  }, [firestore, toast]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Awaiting':
        return 'secondary';
      case 'Boarded':
        return 'default';
      default:
        return 'outline';
    }
  };

  const isLoading = isLoadingSchedule || isLoadingBookings || isLoadingRoute || isLoadingBoarding;

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading boarding manifest...</p>
      </div>
    );
  }

  if (!schedule) {
     return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <p>Schedule not found.</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="w-fit p-0 h-auto" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trips
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Passenger Manifest</CardTitle>
          <CardDescription>
            Manifest for {route?.name} departing at {schedule.departureTime} on {format(new Date(schedule.date || Date.now()), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger Name</TableHead>
                <TableHead>Booking Ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.length > 0 ? (
                passengers.map((passenger) => (
                  <TableRow key={passenger.id}>
                    <TableCell className="font-medium">{passenger.fullName}</TableCell>
                    <TableCell>{passenger.bookingId}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(passenger.boardingStatus)}>
                        {passenger.boardingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {passenger.boardingStatus === 'Awaiting' ? (
                          <Button variant="outline" size="sm" onClick={() => handleBoarding(passenger)}>
                              <LogIn className="mr-2 h-4 w-4" /> Board
                          </Button>
                       ) : (
                          <Button variant="secondary" size="sm" onClick={() => handleDeboarding(passenger)}>
                             <LogOut className="mr-2 h-4 w-4" /> Deboard
                          </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No passengers booked for this trip.
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
