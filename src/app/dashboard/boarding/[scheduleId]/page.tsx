
'use client';

import React, { useMemo, useCallback, useState, Fragment, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, UserCheck, UserX, LogIn, LogOut, Users, Ticket, UserMinus, Play, Square, Ship, Printer } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PrintableManifest } from '@/components/printable-manifest';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function BoardingManifestPage() {
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const scheduleId = params.scheduleId as string;
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);

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
  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery, { idField: 'firestoreId' });
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(boardingRecordsQuery);
  const { data: route, isLoading: isLoadingRoute } = useDoc(useMemoFirebase(() => (firestore && schedule?.routeId) ? doc(firestore, 'routes', schedule.routeId) : null, [firestore, schedule]));
  const { data: ship, isLoading: isLoadingShip } = useDoc(useMemoFirebase(() => (firestore && schedule?.shipId) ? doc(firestore, 'ships', schedule.shipId) : null, [firestore, schedule]));
  const { data: allShips, isLoading: isLoadingAllShips } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]));

  const passengers = useMemo(() => {
    if (!bookings) return [];
    
    return bookings
      .filter(booking => booking.status === 'Confirmed' || booking.status === 'Completed')
      .flatMap(booking => 
        (booking.passengerInfo || []).map((p: any) => {
          const uniquePassengerId = `${booking.firestoreId}-${p.id}`;
          const boardingRecord = boardingRecords?.find(br => br.passengerId === uniquePassengerId);
          return {
            ...p,
            id: uniquePassengerId,
            bookingId: booking.id,
            firestoreBookingId: booking.firestoreId,
            bookingStatus: booking.status,
            boardingStatus: boardingRecord?.status || 'Awaiting',
            boardingRecordId: boardingRecord?.id,
          };
        })
      );
  }, [bookings, boardingRecords]);

  const boardedPassengers = useMemo(() => {
    return passengers.filter(p => p.boardingStatus === 'Boarded');
  }, [passengers]);


  const boardingStats = useMemo(() => {
    const total = passengers.length;
    const boarded = boardedPassengers.length;
    const awaiting = total - boarded;
    return { total, boarded, awaiting };
  }, [passengers, boardedPassengers]);

  const handleBoarding = useCallback(async (passenger: typeof passengers[0]) => {
    if (!firestore) return;
    
    const batch = writeBatch(firestore);

    const boardingCol = collection(firestore, 'boarding');
    const newBoardingRef = doc(boardingCol);
    batch.set(newBoardingRef, {
        passengerId: passenger.id,
        passengerName: passenger.fullName,
        bookingId: passenger.firestoreBookingId,
        scheduleId,
        status: 'Boarded',
        boardingTime: serverTimestamp()
    });

    const bookingRef = doc(firestore, 'bookings', passenger.firestoreBookingId);
    batch.update(bookingRef, { status: 'Completed' });

    try {
        await batch.commit();
        toast({ title: "Passenger Boarded", description: `${passenger.fullName} has been marked as boarded and booking is completed.` });
    } catch (error) {
        console.error("Failed to update records:", error);
        toast({
            variant: "destructive",
            title: "Boarding Incomplete",
            description: "Could not update the main booking status. Please check logs."
        });
    }

  }, [firestore, scheduleId, toast]);

  const handleDeboarding = useCallback(async (passenger: typeof passengers[0]) => {
    if (!firestore || !passenger.boardingRecordId) return;
    const batch = writeBatch(firestore);

    const boardingRef = doc(firestore, 'boarding', passenger.boardingRecordId);
    batch.delete(boardingRef);

    const bookingRef = doc(firestore, 'bookings', passenger.firestoreBookingId);
    batch.update(bookingRef, { status: 'Confirmed' });
    
    try {
        await batch.commit();
        toast({ title: "Passenger Deboarded", description: `${passenger.fullName}'s status has been reset and booking is now Confirmed.` });
    } catch(error) {
        console.error("Failed to deboard passenger:", error);
        toast({
            variant: "destructive",
            title: "Deboarding Failed",
            description: "Could not update records. Please check logs."
        });
    }
  }, [firestore, toast]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Awaiting': return 'secondary';
      case 'Boarded': return 'default';
      default: return 'outline';
    }
  };
  
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    try {
        return differenceInYears(new Date(), new Date(birthDate)).toString();
    } catch { return 'N/A'; }
  };

  const isLoading = isLoadingSchedule || isLoadingBookings || isLoadingRoute || isLoadingBoarding || isLoadingShip || isLoadingAllShips;
  const isBoardingActive = schedule?.boardingStatus === 'Boarding';

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

  const BoardingWorkflowButtons = () => {
    const [selectedShipId, setSelectedShipId] = useState(schedule?.shipId || '');
    
    const availableShips = useMemo(() => {
        return allShips?.filter(s => s.status === 'In Service') || [];
    }, [allShips]);
    
    const handleStatusChange = useCallback(async (newStatus: 'Boarding' | 'Boarding Closed' | 'Departed') => {
      if (!scheduleRef) return;
      
      const updateData: { boardingStatus: string, shipId?: string, shipName?: string } = { boardingStatus: newStatus };
      
      if (newStatus === 'Boarding') {
          if (!selectedShipId) {
              toast({ variant: 'destructive', title: 'No Ship Assigned', description: 'Please assign a ship to the trip before starting boarding.' });
              return;
          }
          const selectedShip = allShips?.find(s => s.id === selectedShipId);
          if (selectedShip) {
              updateData.shipId = selectedShipId;
              updateData.shipName = selectedShip.name;
          }
      }

      try {
        await updateDoc(scheduleRef, updateData);
        toast({
          title: `Trip Status Updated`,
          description: `The trip is now: ${newStatus}`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not update the trip status.',
        });
      }
    }, [scheduleRef, toast, selectedShipId, allShips]);


    switch (schedule.boardingStatus) {
      case 'Boarding':
        return <Button onClick={() => handleStatusChange('Boarding Closed')}><Square className="mr-2 h-4 w-4" /> Close Boarding</Button>;
      case 'Boarding Closed':
        return <Button onClick={() => handleStatusChange('Departed')}><Ship className="mr-2 h-4 w-4" /> Mark as Departed</Button>;
      case 'Departed':
        return <p className="text-sm font-medium text-muted-foreground">Trip has departed.</p>;
      default: // 'Awaiting'
        return (
            <div className="flex items-end gap-2">
                {!schedule.shipId && (
                    <div className="space-y-1">
                        <Label htmlFor="ship-select">Assign Ship</Label>
                        <Select onValueChange={setSelectedShipId} value={selectedShipId}>
                            <SelectTrigger id="ship-select" className="w-[200px]">
                                <SelectValue placeholder="Select a ship..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableShips.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <Button onClick={() => handleStatusChange('Boarding')} disabled={!selectedShipId}><Play className="mr-2 h-4 w-4" /> Start Boarding</Button>
            </div>
        );
    }
  };

  return (
    <>
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="w-fit p-0 h-auto" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trips
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight">Passenger Manifest</CardTitle>
          <CardDescription>
            Manifest for {route?.name} departing at {schedule.departureTime} on {format(new Date(schedule.date || Date.now()), 'PPP')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <BoardingWorkflowButtons />
            {schedule.boardingStatus === 'Boarding Closed' && (
              <Button variant="outline" onClick={() => setIsPrintViewOpen(true)}>
                <Printer className="mr-2 h-4 w-4" /> Print Manifest
              </Button>
            )}
        </div>
      </div>
      <Separator/>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Confirmed Passengers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boardingStats.total}</div>
              <p className="text-xs text-muted-foreground">Total confirmed passengers for this trip.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boarded</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boardingStats.boarded}</div>
              <p className="text-xs text-muted-foreground">Passengers who have boarded.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boardingStats.awaiting}</div>
              <p className="text-xs text-muted-foreground">Passengers yet to board.</p>
            </CardContent>
          </Card>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Passenger List</CardTitle>
          <CardDescription>
            {isBoardingActive ? "Boarding is in progress." : `Boarding is currently ${schedule.boardingStatus || 'Awaiting'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger Name</TableHead>
                <TableHead>Booking Ref</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.length > 0 ? (
                passengers.map((passenger) => (
                  <TableRow key={passenger.id}>
                    <TableCell className="font-medium">{passenger.fullName}</TableCell>
                    <TableCell className="font-mono">{passenger.bookingId}</TableCell>
                    <TableCell>{calculateAge(passenger.birthDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(passenger.boardingStatus)}>
                        {passenger.boardingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {passenger.boardingStatus === 'Awaiting' ? (
                          <Button variant="outline" size="sm" onClick={() => handleBoarding(passenger)} disabled={!isBoardingActive}>
                              <LogIn className="mr-2 h-4 w-4" /> Board
                          </Button>
                       ) : (
                          <Button variant="secondary" size="sm" onClick={() => handleDeboarding(passenger)} disabled={!isBoardingActive}>
                             <LogOut className="mr-2 h-4 w-4" /> Deboard
                          </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No confirmed passengers for this trip.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <Dialog open={isPrintViewOpen} onOpenChange={setIsPrintViewOpen}>
      <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Printable Passenger Manifest</DialogTitle>
            <DialogDescription>A printable version of the passenger manifest for this trip.</DialogDescription>
          </DialogHeader>
          <PrintableManifest 
            passengers={boardedPassengers}
            route={route}
            schedule={schedule}
            ship={ship}
          />
      </DialogContent>
    </Dialog>
    </>
  );
}

    