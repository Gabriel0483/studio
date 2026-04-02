
'use client';

import React, { useMemo, useCallback, useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, updateDoc, writeBatch, runTransaction, getDoc, DocumentReference, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, UserCheck, UserX, LogIn, LogOut, Users, Ticket, UserMinus, Play, Square, Ship, Printer, CheckCircle } from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PrintableManifest } from '@/components/printable-manifest';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
                    // Find or create a special instance for this daily template on this date
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
                        };
                        transaction.set(scheduleToUpdateRef, newInstanceData);
                    }
                } else {
                    scheduleToUpdateRef = doc(firestore, 'schedules', baseSchedule.id);
                    transaction.update(scheduleToUpdateRef, { status: newStatus });
                }
            });

            toast({
                title: 'Trip Status Updated',
                description: `The trip status has been set to ${newStatus}.`,
            });
        } catch (error) {
            console.error("Failed to update trip status:", error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update the trip status.',
            });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const tripStatusOptions = ["On Time", "Delayed", "Cancelled"];
    const currentStatus = effectiveSchedule?.status || 'On Time';

    if (currentStatus === 'Departed' || currentStatus === 'Arrived') {
        return <Badge variant="secondary">Status: {currentStatus}</Badge>
    }

    return (
        <div className="flex items-center gap-2">
             <Label htmlFor="trip-status" className="text-sm shrink-0">Trip Status</Label>
             <Select onValueChange={handleStatusUpdate} value={currentStatus} disabled={isUpdating}>
                <SelectTrigger id="trip-status" className="w-[150px]">
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
                setEffectiveSchedule({ ...baseSchedule, date: tripDateStr }); 
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
  
  // Boarding and deboarding are allowed during 'Boarding' phase and also when 'Boarding Closed' (before departure)
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
        return <Button onClick={() => handleStatusChange('Arrived')}><CheckCircle className="mr-2 h-4 w-4" /> Mark as Arrived</Button>;
    }

    switch (displaySchedule.boardingStatus) {
      case 'Boarding':
        return <Button onClick={() => handleStatusChange('Boarding Closed')}><Square className="mr-2 h-4 w-4" /> Close Boarding</Button>;
      case 'Boarding Closed':
        return (
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleStatusChange('Boarding')}><Play className="mr-2 h-4 w-4" /> Reopen Boarding</Button>
                <Button onClick={() => handleStatusChange('Departed')}><Ship className="mr-2 h-4 w-4" /> Mark as Departed</Button>
            </div>
        );
      default: // 'Awaiting'
        return (
            <div className="flex items-end gap-2">
                {!displaySchedule.shipId && (
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
                <Button onClick={() => handleStatusChange('Boarding')} disabled={!selectedShipId || displaySchedule.status === 'Cancelled'}><Play className="mr-2 h-4 w-4" /> Start Boarding</Button>
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
            Manifest for {route?.name} departing at {displaySchedule.departureTime} on {format(tripDate, 'PPP')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
            <TripStatusControl baseSchedule={baseSchedule} effectiveSchedule={displaySchedule} tripDateStr={tripDateStr} />
            <BoardingWorkflowButtons 
                baseSchedule={baseSchedule}
                displaySchedule={displaySchedule}
                allShips={allShips || []}
                passengers={passengers}
                tripDateStr={tripDateStr}
            />
            {(displaySchedule.boardingStatus === 'Boarding Closed' || displaySchedule.boardingStatus === 'Departed') && (
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
              <p className="text-xs text-muted-foreground">Passengers currently on board.</p>
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
            {isOperationAllowed ? "Manage passenger boarding and deboarding below." : `Boarding is currently ${displaySchedule.boardingStatus || 'Awaiting'}.`}
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
                       <div className="flex justify-end gap-2">
                        {passenger.boardingStatus !== 'Boarded' && (
                            <Button variant="outline" size="sm" onClick={() => handleBoarding(passenger)} disabled={!isOperationAllowed}>
                                <LogIn className="mr-2 h-4 w-4" /> Board
                            </Button>
                        )}
                        {passenger.boardingStatus === 'Boarded' && (
                            <Button variant="secondary" size="sm" onClick={() => handleDeboarding(passenger)} disabled={!isOperationAllowed}>
                                <LogOut className="mr-2 h-4 w-4" /> Deboard
                            </Button>
                        )}
                       </div>
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
