'use client';

import React, { useMemo, useCallback, useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, updateDoc, writeBatch, runTransaction, getDoc, DocumentReference, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, UserCheck, UserX, LogIn, LogOut, Users, Ticket, UserMinus, Play, Square, Ship, Printer, CheckCircle, Settings2, Info, Clock } from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PrintableManifest } from '@/components/printable-manifest';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const TripStatusControl = ({ baseSchedule, effectiveSchedule, tripDateStr }: { baseSchedule: any, effectiveSchedule: any, tripDateStr: string }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    
    const handleStatusUpdate = async (newStatus: string) => {
        if (!firestore || !baseSchedule) return;
        setIsUpdating(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                let scheduleToUpdateRef: DocumentReference;
                
                if (baseSchedule.tripType === 'Daily') {
                    const specialInstanceQuery = query(
                        collection(firestore, 'schedules'),
                        where('sourceScheduleId', '==', baseSchedule.id),
                        where('date', '==', tripDateStr)
                    );
                    
                    const querySnapshot = await getDocs(specialInstanceQuery);

                    if (!querySnapshot.empty) {
                        scheduleToUpdateRef = querySnapshot.docs[0].ref;
                        transaction.update(scheduleToUpdateRef, { status: newStatus });
                    } else {
                        scheduleToUpdateRef = doc(collection(firestore, 'schedules'));
                        const newInstanceData = {
                            ...baseSchedule,
                            tripType: 'Special',
                            date: tripDateStr,
                            sourceScheduleId: baseSchedule.id,
                            id: scheduleToUpdateRef.id,
                            status: newStatus,
                            waitlistCount: 0,
                            waitlistLimit: baseSchedule.waitlistLimit || 50
                        };
                        transaction.set(scheduleToUpdateRef, newInstanceData);
                    }
                } else {
                    scheduleToUpdateRef = doc(firestore, 'schedules', baseSchedule.id);
                    transaction.update(scheduleToUpdateRef, { status: newStatus });
                }
            });

            toast({ title: 'Trip Status Updated', description: `Status set to ${newStatus}.` });
        } catch (error) {
            console.error("Failed to update trip status:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update status.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const tripStatusOptions = ["On Time", "Delayed", "Cancelled"];
    const currentStatus = effectiveSchedule?.status || 'On Time';

    if (currentStatus === 'Departed' || currentStatus === 'Arrived') {
        return <Badge variant="secondary" className="whitespace-nowrap">Status: {currentStatus}</Badge>
    }

    return (
        <div className="flex items-center gap-2">
             <Select onValueChange={handleStatusUpdate} value={currentStatus} disabled={isUpdating}>
                <SelectTrigger id="trip-status" className="w-[120px] sm:w-[150px]">
                    <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                    {tripStatusOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

const WaitlistControl = ({ baseSchedule, effectiveSchedule, tripDateStr }: { baseSchedule: any, effectiveSchedule: any, tripDateStr: string }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [limit, setLimit] = useState(effectiveSchedule?.waitlistLimit?.toString() || baseSchedule?.waitlistLimit?.toString() || '50');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateLimit = async () => {
        if (!firestore || !baseSchedule) return;
        setIsUpdating(true);
        const newLimit = parseInt(limit, 10);

        try {
            await runTransaction(firestore, async (transaction) => {
                let scheduleRef: DocumentReference;
                if (baseSchedule.tripType === 'Daily') {
                    const q = query(collection(firestore, 'schedules'), where('sourceScheduleId', '==', baseSchedule.id), where('date', '==', tripDateStr));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        scheduleRef = snap.docs[0].ref;
                    } else {
                        scheduleRef = doc(collection(firestore, 'schedules'));
                        transaction.set(scheduleRef, {
                            ...baseSchedule,
                            tripType: 'Special',
                            date: tripDateStr,
                            sourceScheduleId: baseSchedule.id,
                            id: scheduleRef.id,
                            waitlistCount: 0,
                        });
                    }
                } else {
                    scheduleRef = doc(firestore, 'schedules', baseSchedule.id);
                }
                transaction.update(scheduleRef, { waitlistLimit: newLimit });
            });
            toast({ title: 'Waitlist Updated', description: `Limit set to ${newLimit} for this trip.` });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update limit.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" /> Waitlist
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Waitlist Control</DialogTitle>
                        <DialogDescription>Adjust the maximum number of waitlisted bookings for this specific trip.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted p-3 rounded-lg text-center">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Waitlist</p>
                                <p className="text-2xl font-black">{effectiveSchedule?.waitlistCount || 0}</p>
                            </div>
                            <div className="bg-primary/5 p-3 rounded-lg text-center border border-primary/10">
                                <p className="text-[10px] uppercase font-bold text-primary/70">Current Limit</p>
                                <p className="text-2xl font-black text-primary">{effectiveSchedule?.waitlistLimit ?? baseSchedule?.waitlistLimit ?? 50}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-limit">New Waitlist Capacity</Label>
                            <Input id="new-limit" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
                            <p className="text-xs text-muted-foreground">Setting this to 0 will effectively close the waitlist for this trip.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleUpdateLimit} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Limit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};


function ManifestPageContent() {
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const scheduleId = params.scheduleId as string;
  const dateParam = searchParams.get('date');
  const tripDate = useMemo(() => dateParam ? parseISO(dateParam) : new Date(), [dateParam]);
  const tripDateStr = useMemo(() => format(tripDate, 'yyyy-MM-dd'), [tripDate]);

  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [effectiveSchedule, setEffectiveSchedule] = useState<any>(null);

  const baseScheduleRef = useMemoFirebase(() => {
    if (!firestore || !scheduleId) return null;
    return doc(firestore, 'schedules', scheduleId);
  }, [firestore, scheduleId]);

  const { data: baseSchedule, isLoading: isLoadingBaseSchedule } = useDoc(baseScheduleRef);

  useEffect(() => {
    if (!baseSchedule || !firestore) return;

    const findEffectiveSchedule = async () => {
        if (baseSchedule.tripType === 'Special') {
            setEffectiveSchedule(baseSchedule);
        } else {
            const q = query(
                collection(firestore, 'schedules'),
                where('sourceScheduleId', '==', baseSchedule.id),
                where('date', '==', tripDateStr)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setEffectiveSchedule({ ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id });
            } else {
                setEffectiveSchedule({ ...baseSchedule, date: tripDateStr, waitlistCount: 0 }); 
            }
        }
    };
    findEffectiveSchedule();
  }, [baseSchedule, firestore, tripDateStr]);
  
  const effectiveScheduleRef = useMemoFirebase(() => {
    if (!firestore || !effectiveSchedule?.id) return null;
    return doc(firestore, 'schedules', effectiveSchedule.id);
  }, [firestore, effectiveSchedule]);
  
  const { data: realtimeEffectiveSchedule } = useDoc(effectiveScheduleRef);
  const displaySchedule = realtimeEffectiveSchedule || effectiveSchedule;

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !displaySchedule?.id) return null;
    return query(collection(firestore, 'bookings'), where('scheduleId', '==', displaySchedule.id));
  }, [firestore, displaySchedule]);

  const boardingRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !displaySchedule?.id) return null;
    return query(collection(firestore, 'boarding'), where('scheduleId', '==', displaySchedule.id));
  }, [firestore, displaySchedule]);
  
  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery, { idField: 'firestoreId' });
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(boardingRecordsQuery);
  const { data: route } = useDoc(useMemoFirebase(() => (firestore && displaySchedule?.routeId) ? doc(firestore, 'routes', displaySchedule.routeId) : null, [firestore, displaySchedule]));
  const { data: ship } = useDoc(useMemoFirebase(() => (firestore && displaySchedule?.shipId) ? doc(firestore, 'ships', displaySchedule.shipId) : null, [firestore, displaySchedule]));
  const { data: allShips } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]));

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
    if (!firestore || !displaySchedule?.id) return;
    
    const batch = writeBatch(firestore);
    const boardingCol = collection(firestore, 'boarding');
    const newBoardingRef = doc(boardingCol);
    
    batch.set(newBoardingRef, {
        passengerId: passenger.id,
        passengerName: passenger.fullName,
        bookingId: passenger.firestoreBookingId,
        scheduleId: displaySchedule.id,
        status: 'Boarded',
        boardingTime: serverTimestamp()
    });

    const bookingRef = doc(firestore, 'bookings', passenger.firestoreBookingId);
    batch.update(bookingRef, { status: 'Completed' });

    try {
        await batch.commit();
        toast({ title: "Passenger Boarded", description: `${passenger.fullName} has been marked as boarded.` });
    } catch (error) {
        console.error("Failed to update records:", error);
        toast({ variant: "destructive", title: "Boarding Failed", description: "Could not update the passenger status." });
    }

  }, [firestore, displaySchedule, toast]);

  const handleDeboarding = useCallback(async (passenger: typeof passengers[0]) => {
    if (!firestore || !passenger.boardingRecordId) return;
    const batch = writeBatch(firestore);

    const boardingRef = doc(firestore, 'boarding', passenger.boardingRecordId);
    batch.delete(boardingRef);

    const bookingRef = doc(firestore, 'bookings', passenger.firestoreBookingId);
    batch.update(bookingRef, { status: 'Confirmed' });
    
    try {
        await batch.commit();
        toast({ title: "Passenger Deboarded", description: `${passenger.fullName} has been deboarded.` });
    } catch(error) {
        console.error("Failed to deboard passenger:", error);
        toast({ variant: "destructive", title: "Deboarding Failed", description: "Could not update records." });
    }
  }, [firestore, toast]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Awaiting': return 'secondary';
      case 'Boarded': return 'default';
      case 'No-show': return 'destructive';
      default: return 'outline';
    }
  };
  
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    try {
        return differenceInYears(new Date(), new Date(birthDate)).toString();
    } catch { return 'N/A'; }
  };

  const isLoading = isLoadingBaseSchedule || !displaySchedule || isLoadingBookings || isLoadingBoarding;
  const isOperationAllowed = displaySchedule?.boardingStatus === 'Boarding' || displaySchedule?.boardingStatus === 'Boarding Closed';

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading trip manifest...</p>
      </div>
    );
  }
  
  if (!displaySchedule) {
     return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <p>Schedule not found for the selected date.</p>
        </div>
    )
  }

  const BoardingWorkflowButtons = ({ baseSchedule, displaySchedule, allShips, passengers, tripDateStr }: { baseSchedule: any, displaySchedule: any, allShips: any[], passengers: any[], tripDateStr: string }) => {
    const [selectedShipId, setSelectedShipId] = useState(displaySchedule?.shipId || '');
    const availableShips = useMemo(() => allShips?.filter(s => s.status === 'In Service') || [], [allShips]);
    
    const handleStatusChange = useCallback(async (newStatus: 'Boarding' | 'Boarding Closed' | 'Departed' | 'Arrived') => {
        if (!baseSchedule) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                let scheduleToUpdateRef: DocumentReference;
                
                if (baseSchedule.tripType === 'Daily') {
                    const specialInstanceQuery = query(
                        collection(firestore, 'schedules'),
                        where('sourceScheduleId', '==', baseSchedule.id),
                        where('date', '==', tripDateStr)
                    );
                    const querySnapshot = await getDocs(specialInstanceQuery);

                    if (!querySnapshot.empty) {
                        scheduleToUpdateRef = querySnapshot.docs[0].ref;
                    } else {
                        scheduleToUpdateRef = doc(collection(firestore, 'schedules'));
                    }
                } else { 
                    scheduleToUpdateRef = doc(firestore, 'schedules', baseSchedule.id);
                }
                
                const scheduleIdForRecords = scheduleToUpdateRef.id;
                let updateData: any = {};
                
                if (newStatus === 'Boarding') {
                    updateData.boardingStatus = newStatus;
                    if (!selectedShipId) {
                        throw new Error('Please assign a ship to the trip before starting boarding.');
                    }
                    const selectedShip = allShips?.find(s => s.id === selectedShipId);
                    if (selectedShip) {
                        updateData.shipId = selectedShipId;
                        updateData.shipName = selectedShip.name;
                    }
                } else if (newStatus === 'Boarding Closed') {
                    updateData.boardingStatus = newStatus;
                    const noShowPassengers = passengers.filter(p => p.boardingStatus === 'Awaiting');
                    
                    noShowPassengers.forEach(passenger => {
                        const newBoardingRef = doc(collection(firestore, 'boarding'));
                        transaction.set(newBoardingRef, {
                            id: newBoardingRef.id,
                            passengerId: passenger.id,
                            passengerName: passenger.fullName,
                            bookingId: passenger.firestoreBookingId,
                            scheduleId: scheduleIdForRecords,
                            status: 'No-show',
                            boardingTime: serverTimestamp(),
                        });
                    });
                } else if (newStatus === 'Departed') {
                    updateData.boardingStatus = newStatus;
                    updateData.status = 'Departed';
                } else if (newStatus === 'Arrived') {
                    updateData.status = 'Arrived';
                } else {
                    updateData.boardingStatus = newStatus;
                }

                if (baseSchedule.tripType === 'Daily' && (await transaction.get(scheduleToUpdateRef)).exists() === false) {
                     const newInstanceData = {
                        ...baseSchedule,
                        tripType: 'Special',
                        date: tripDateStr,
                        sourceScheduleId: baseSchedule.id,
                        id: scheduleToUpdateRef.id,
                        waitlistCount: 0,
                        ...updateData,
                    };
                    transaction.set(scheduleToUpdateRef, newInstanceData);
                } else {
                    transaction.update(scheduleToUpdateRef, updateData);
                }
            });

            toast({ title: `Trip Status Updated`, description: `The trip is now: ${newStatus}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update the trip status.' });
        }
    }, [baseSchedule, selectedShipId, allShips, passengers, tripDateStr]);


    if (displaySchedule.status === 'Arrived') {
        return <p className="text-sm font-medium text-green-600 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Trip Completed</p>;
    }
    
    if (displaySchedule.boardingStatus === 'Departed') {
        return <Button onClick={() => handleStatusChange('Arrived')} className="w-full sm:w-auto"><CheckCircle className="mr-2 h-4 w-4" /> Arrived</Button>;
    }

    switch (displaySchedule.boardingStatus) {
      case 'Boarding':
        return <Button onClick={() => handleStatusChange('Boarding Closed')} className="w-full sm:w-auto"><Square className="mr-2 h-4 w-4" /> Close Boarding</Button>;
      case 'Boarding Closed':
        return (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => handleStatusChange('Boarding')} className="w-full sm:w-auto"><Play className="mr-2 h-4 w-4" /> Reopen</Button>
                <Button onClick={() => handleStatusChange('Departed')} className="w-full sm:w-auto"><Ship className="mr-2 h-4 w-4" /> Depart</Button>
            </div>
        );
      default: // 'Awaiting'
        return (
            <div className="flex flex-col sm:flex-row items-end gap-2 w-full sm:w-auto">
                {!displaySchedule.shipId && (
                    <div className="space-y-1 w-full sm:w-auto">
                        <Label htmlFor="ship-select" className="text-[10px] uppercase font-bold text-muted-foreground">Assign Ship</Label>
                        <Select onValueChange={setSelectedShipId} value={selectedShipId}>
                            <SelectTrigger id="ship-select" className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select ship..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableShips.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <Button onClick={() => handleStatusChange('Boarding')} disabled={!selectedShipId || displaySchedule.status === 'Cancelled'} className="w-full sm:w-auto">
                    <Play className="mr-2 h-4 w-4" /> Start Boarding
                </Button>
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

      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Passenger Manifest</CardTitle>
          <CardDescription>
            {route?.name} • {displaySchedule.departureTime} • {format(tripDate, 'PPP')}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
            <TripStatusControl baseSchedule={baseSchedule} effectiveSchedule={displaySchedule} tripDateStr={tripDateStr} />
            <WaitlistControl baseSchedule={baseSchedule} effectiveSchedule={displaySchedule} tripDateStr={tripDateStr} />
            <BoardingWorkflowButtons 
                baseSchedule={baseSchedule}
                displaySchedule={displaySchedule}
                allShips={allShips || []}
                passengers={passengers}
                tripDateStr={tripDateStr}
            />
            {(displaySchedule.boardingStatus === 'Boarding Closed' || displaySchedule.boardingStatus === 'Departed' || displaySchedule.boardingStatus === 'Arrived') && (
              <Button variant="outline" onClick={() => setIsPrintViewOpen(true)} className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            )}
        </div>
      </div>
      <Separator/>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Confirmed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boardingStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Boarded</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boardingStats.boarded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Awaiting</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boardingStats.awaiting}</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-primary/70">Waitlist</CardTitle>
              <Clock className="h-4 w-4 text-primary/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{displaySchedule.waitlistCount || 0} / {displaySchedule.waitlistLimit ?? baseSchedule?.waitlistLimit ?? 50}</div>
            </CardContent>
          </Card>
        </div>

      <Card>
        <CardHeader className="px-4 py-4 sm:px-6">
          <CardTitle className="text-lg">Passenger List</CardTitle>
          <CardDescription className="text-xs">
            {isOperationAllowed ? "Tap 'Board' or 'Deboard' to update status." : `Trip is currently ${displaySchedule.boardingStatus || 'Awaiting'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="hidden sm:table-cell">Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {passengers.length > 0 ? (
                    passengers.map((passenger) => (
                    <TableRow key={passenger.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{passenger.fullName}</TableCell>
                        <TableCell className="font-mono text-[10px] sm:text-xs">{passenger.bookingId}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">{calculateAge(passenger.birthDate)}</TableCell>
                        <TableCell>
                        <Badge variant={getStatusVariant(passenger.boardingStatus)} className="text-[10px] px-1.5 py-0">
                            {passenger.boardingStatus}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        <div className="flex justify-end">
                            {passenger.boardingStatus !== 'Boarded' ? (
                                <Button variant="outline" size="sm" onClick={() => handleBoarding(passenger)} disabled={!isOperationAllowed} className="h-7 px-2 text-[10px]">
                                    <LogIn className="mr-1 h-3 w-3" /> Board
                                </Button>
                            ) : (
                                <Button variant="secondary" size="sm" onClick={() => handleDeboarding(passenger)} disabled={!isOperationAllowed} className="h-7 px-2 text-[10px]">
                                    <LogOut className="mr-1 h-3 w-3" /> Deboard
                                </Button>
                            )}
                        </div>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No confirmed passengers for this trip.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    <Dialog open={isPrintViewOpen} onOpenChange={setIsPrintViewOpen}>
      <DialogContent className="max-w-4xl p-0 h-[90vh] sm:h-auto overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Trip Manifest Preview</DialogTitle>
            <DialogDescription>Review and print the manifest.</DialogDescription>
          </DialogHeader>
          <PrintableManifest 
            passengers={boardedPassengers}
            route={route}
            schedule={displaySchedule}
            ship={ship}
          />
      </DialogContent>
    </Dialog>
    </>
  );
}


export default function BoardingManifestPage() {
  return (
    <Suspense fallback={
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Loading...</p>
        </div>
    }>
      <ManifestPageContent />
    </Suspense>
  );
}
