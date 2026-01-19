
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, query, writeBatch, getDocs, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Plus, Trash2, Calendar as CalendarIcon, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';
import { format, parse } from 'date-fns';

interface Ship {
  id: string;
  name: string;
}

interface Route {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  assignedShipId?: string;
}

interface Schedule {
  id: string;
  tripType: 'Daily' | 'Special';
  shipId?: string | null;
  shipName?: string | null;
  routeId: string;
  date?: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  status?: 'On Time' | 'Delayed' | 'Departed' | 'Arrived' | 'Cancelled';
  sourceScheduleId?: string;
}

const ScheduleForm = ({
  firestore,
  schedule,
  ships,
  routes,
  staff,
  onFinished,
}: {
  firestore: Firestore;
  schedule?: Schedule;
  ships: Ship[];
  routes: Route[];
  staff: Staff[];
  onFinished: () => void;
}) => {
  const [shipId, setShipId] = useState(schedule?.shipId || 'unassigned');
  const [routeId, setRouteId] = useState(schedule?.routeId || '');
  const [departureTime, setDepartureTime] = useState(schedule?.departureTime || '');
  const [arrivalTime, setArrivalTime] = useState(schedule?.arrivalTime || '');
  const [availableSeats, setAvailableSeats] = useState(schedule?.availableSeats?.toString() || '');
  const [assignedCrew, setAssignedCrew] = useState<Staff[]>([]);
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (shipId && shipId !== 'unassigned' && staff) {
        const crew = staff.filter(s => s.assignedShipId === shipId);
        setAssignedCrew(crew);
    } else {
        setAssignedCrew([]);
    }
  }, [shipId, staff]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !departureTime || !arrivalTime || !availableSeats) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required fields.',
      });
      return;
    }
    
    const seatsNum = parseInt(availableSeats, 10);
     if (isNaN(seatsNum)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Seats',
            description: 'Available seats must be a valid number.',
        });
        return;
    }
    
    const finalShipId = shipId === 'unassigned' ? null : shipId;
    const selectedShip = ships.find(s => s.id === finalShipId);

    const scheduleData: Partial<Schedule> = {
      tripType: 'Daily',
      shipId: finalShipId,
      shipName: selectedShip ? selectedShip.name : null,
      routeId,
      departureTime,
      arrivalTime,
      availableSeats: seatsNum,
      status: schedule?.status || 'On Time',
    };

    if (schedule) {
      const scheduleRef = doc(firestore, 'schedules', schedule.id);
      updateDocumentNonBlocking(scheduleRef, scheduleData);
      toast({
        title: 'Schedule Updated',
        description: `The schedule has been successfully updated.`,
      });
    } else {
      const schedulesCol = collection(firestore, 'schedules');
      addDocumentNonBlocking(schedulesCol, scheduleData);
      toast({
        title: 'Schedule Added',
        description: `The schedule has been successfully added.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-2">
            <Label htmlFor="routeId">Route</Label>
            <Select onValueChange={setRouteId} defaultValue={routeId}>
                <SelectTrigger id="routeId"><SelectValue placeholder="Select a route" /></SelectTrigger>
                <SelectContent>
                    {routes.map((route) => <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="departureTime">Departure Time</Label>
          <Input
            id="departureTime"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arrivalTime">Arrival Time</Label>
          <Input
            id="arrivalTime"
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
         <div className="space-y-2">
            <Label htmlFor="shipId">Ship (Optional)</Label>
            <Select onValueChange={setShipId} defaultValue={shipId}>
                <SelectTrigger id="shipId"><SelectValue placeholder="Select a ship" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {ships.map((ship) => <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="availableSeats">Available Seats</Label>
            <Input
            id="availableSeats"
            type="number"
            value={availableSeats}
            onChange={(e) => setAvailableSeats(e.target.value)}
            placeholder="e.g., 150"
            />
        </div>
      </div>

       {assignedCrew.length > 0 && (
        <div className="space-y-2 rounded-md border p-4">
          <h4 className="font-medium text-sm flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Assigned Crew
          </h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {assignedCrew.map(member => (
              <li key={member.id}>{member.name} - <span className="font-semibold">{member.role}</span></li>
            ))}
          </ul>
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{schedule ? 'Update Schedule' : 'Add Schedule'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function SchedulesPage() {
  const firestore = useFirestore();
  const schedulesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'schedules'), orderBy('departureTime', 'asc')) : null, [firestore]);
  const shipsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);

  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<Schedule>(schedulesQuery);
  const { data: ships, isLoading: isLoadingShips } = useCollection<Omit<Ship, 'id'>>(shipsQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection<Omit<Route, 'id'>>(routesQuery);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Omit<Staff, 'id'>>(staffQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>(undefined);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  const { toast } = useToast();

  const dailySchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(s => s.tripType === 'Daily');
  }, [schedules]);
  
  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  const confirmDelete = (schedule: Schedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteConfirmOpen(true);
  };
  
  const executeDelete = async () => {
    if (!firestore || !scheduleToDelete) return;

    try {
      const batch = writeBatch(firestore);
      const scheduleRef = doc(firestore, 'schedules', scheduleToDelete.id);
      let specialTripsDeleted = 0;

      // This is a daily template, so delete all future special trips created from it.
      const specialTripsQuery = query(
        collection(firestore, 'schedules'),
        where('sourceScheduleId', '==', scheduleToDelete.id)
      );
      const specialTripsSnapshot = await getDocs(specialTripsQuery);
      specialTripsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        specialTripsDeleted++;
      });
      
      batch.delete(scheduleRef);
      await batch.commit();

      toast({
        title: 'Schedule Deleted',
        description: `Template and ${specialTripsDeleted} derived trips deleted.`,
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsDeleteConfirmOpen(false);
      setScheduleToDelete(null);
    }
  };
  
  const handleClearPast = async () => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
        return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
        const q = query(
            collection(firestore, 'schedules'), 
            where('tripType', '==', 'Special'), 
            where('date', '<', today)
        );
        
        const pastSchedulesSnapshot = await getDocs(q);
        
        if (pastSchedulesSnapshot.empty) {
            toast({ title: 'No Past Schedules', description: 'There are no expired special schedules to clear.' });
            setIsClearConfirmOpen(false);
            return;
        }

        const batch = writeBatch(firestore);
        pastSchedulesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        toast({
            title: 'Cleanup Complete',
            description: `Successfully deleted ${pastSchedulesSnapshot.size} past special schedules.`,
        });

    } catch (error) {
        console.error('Error clearing past schedules:', error);
        toast({ variant: 'destructive', title: 'Cleanup Failed', description: 'Could not clear past schedules. A special index might be required in Firestore.' });
    } finally {
        setIsClearConfirmOpen(false);
    }
  };
  
  const formatTime = (timeString: string) => {
    if (!timeString) return "Not set";
    try {
        const date = parse(timeString, 'HH:mm', new Date());
        return format(date, 'p');
    } catch (e) {
        return "Invalid Time";
    }
  };

  const isLoading = isLoadingSchedules || isLoadingShips || isLoadingRoutes || isLoadingStaff;

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule Management</h1>
          <p className="text-muted-foreground">
            Create, view, and manage daily trip templates.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsClearConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Past Schedules
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => setEditingSchedule(undefined)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit Schedule Template' : 'Add a New Schedule Template'}</DialogTitle>
                <DialogDescription>
                    Fill in the details for a recurring daily trip.
                </DialogDescription>
                </DialogHeader>
                {firestore && (
                <ScheduleForm
                    firestore={firestore}
                    schedule={editingSchedule}
                    ships={ships || []}
                    routes={routes || []}
                    staff={staff || []}
                    onFinished={() => setIsFormOpen(false)}
                />
                )}
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Templates</CardTitle>
          <CardDescription>A list of all recurring daily trips.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading schedules...
                  </TableCell>
                </TableRow>
              ) : dailySchedules && dailySchedules.length > 0 ? (
                dailySchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{getRouteName(schedule.routeId)}</TableCell>
                    <TableCell>Daily</TableCell>
                    <TableCell>{formatTime(schedule.departureTime)}</TableCell>
                    <TableCell>{schedule.availableSeats}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(schedule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No schedule templates found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingSchedule(undefined); setIsFormOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first schedule
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this schedule template and all future special trips created from it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Past Schedules?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all 'Special' trips with a travel date before today. This can help clean up the database but cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearPast} className="bg-destructive hover:bg-destructive/90">
              Yes, Clear Schedules
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
