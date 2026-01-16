
'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, query, where, getDocs, writeBatch, deleteDoc, orderBy } from 'firebase/firestore';
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
import { Pencil, Plus, Trash2, Calendar as CalendarIcon, Users, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';
import { format, parse, addDays } from 'date-fns';

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
  shipId?: string;
  shipName?: string;
  routeId: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  status?: 'On Time' | 'Delayed' | 'Departed' | 'Arrived' | 'Cancelled';
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
  const [date, setDate] = useState(schedule?.date || '');
  const [departureTime, setDepartureTime] = useState(schedule?.departureTime || '');
  const [arrivalTime, setArrivalTime] = useState(schedule?.arrivalTime || '');
  const [availableSeats, setAvailableSeats] = useState(schedule?.availableSeats || '');
  const [assignedCrew, setAssignedCrew] = useState<Staff[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (shipId && shipId !== 'unassigned' && staff) {
        const crew = staff.filter(s => s.assignedShipId === shipId);
        setAssignedCrew(crew);
    } else {
        setAssignedCrew([]);
    }
  }, [shipId, staff]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !departureTime || !arrivalTime || !availableSeats || !date) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required fields.',
      });
      return;
    }
    
    const seatsNum = parseInt(availableSeats as string, 10);
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

    const scheduleData = {
      shipId: finalShipId,
      shipName: selectedShip ? selectedShip.name : 'Unassigned',
      routeId,
      date,
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
  
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 5);
  const minDateStr = today.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
            <Label htmlFor="routeId">Route</Label>
            <Select onValueChange={setRouteId} defaultValue={routeId}>
                <SelectTrigger id="routeId"><SelectValue placeholder="Select a route" /></SelectTrigger>
                <SelectContent>
                    {routes.map((route) => <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDateStr}
                max={maxDateStr}
            />
        </div>
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

const BulkScheduleForm = ({
  firestore,
  ships,
  routes,
  onFinished,
}: {
  firestore: Firestore;
  ships: Ship[];
  routes: Route[];
  onFinished: () => void;
}) => {
  const [shipId, setShipId] = useState('unassigned');
  const [routeId, setRouteId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const { toast } = useToast();

  const handleBulkSubmit = async (e: React.FormEvent) => {
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
    if (isNaN(seatsNum) || seatsNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Seats',
        description: 'Available seats must be a positive number.',
      });
      return;
    }

    const finalShipId = shipId === 'unassigned' ? null : shipId;
    const selectedShip = ships.find(s => s.id === finalShipId);

    try {
      const batch = writeBatch(firestore);
      const schedulesCol = collection(firestore, 'schedules');

      for (let i = 0; i < 5; i++) {
        const scheduleDate = addDays(new Date(), i);
        const dateStr = format(scheduleDate, 'yyyy-MM-dd');

        const newScheduleRef = doc(schedulesCol); // auto-generate ID
        
        const scheduleData = {
          shipId: finalShipId,
          shipName: selectedShip ? selectedShip.name : 'Unassigned',
          routeId,
          date: dateStr,
          departureTime,
          arrivalTime,
          availableSeats: seatsNum,
          status: 'On Time',
          boardingStatus: 'Awaiting',
        };
        batch.set(newScheduleRef, scheduleData);
      }

      await batch.commit();
      toast({
          title: 'Schedules Generated',
          description: '5 daily schedules have been created for the selected route.',
      });
      onFinished();
    } catch (error: any) {
      console.error("Error bulk generating schedules:", error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: `An error occurred: ${error.message}.`,
      });
    }
  };

  return (
    <form onSubmit={handleBulkSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bulk-routeId">Route</Label>
        <Select onValueChange={setRouteId} defaultValue={routeId}>
          <SelectTrigger id="bulk-routeId"><SelectValue placeholder="Select a route" /></SelectTrigger>
          <SelectContent>
            {routes.map((route) => <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bulk-departureTime">Departure Time</Label>
          <Input id="bulk-departureTime" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bulk-arrivalTime">Arrival Time</Label>
          <Input id="bulk-arrivalTime" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
         <div className="space-y-2">
            <Label htmlFor="bulk-shipId">Ship (Optional)</Label>
            <Select onValueChange={setShipId} defaultValue={shipId}>
                <SelectTrigger id="bulk-shipId"><SelectValue placeholder="Select a ship" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {ships.map((ship) => <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="bulk-availableSeats">Available Seats</Label>
            <Input id="bulk-availableSeats" type="number" value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} placeholder="e.g., 150" />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit">Generate 5 Days</Button>
      </DialogFooter>
    </form>
  );
};

export default function SchedulesPage() {
  const firestore = useFirestore();
  const schedulesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'schedules'), orderBy('date', 'asc'), orderBy('departureTime', 'asc')) : null, [firestore]);
  const shipsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);


  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<Omit<Schedule, 'id'>>(schedulesQuery);
  const { data: ships, isLoading: isLoadingShips } = useCollection<Omit<Ship, 'id'>>(shipsQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection<Omit<Route, 'id'>>(routesQuery);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Omit<Staff, 'id'>>(staffQuery);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>(undefined);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);


  const { toast } = useToast();
  
  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  const handleDelete = async (schedule: Schedule) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection not found.' });
      return;
    }
  
    const confirmMessage = `Are you sure you want to delete this schedule? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
  
    try {
      const bookingsQuery = query(collection(firestore, 'bookings'), where('scheduleId', '==', schedule.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      if (!bookingsSnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Deletion Blocked',
          description: `This schedule has ${bookingsSnapshot.size} active booking(s). Please cancel or rebook them first.`,
          duration: 5000,
        });
        return;
      }
      
      const scheduleRef = doc(firestore, 'schedules', schedule.id);
      await deleteDoc(scheduleRef);
      
      toast({
        title: 'Schedule Deleted',
        description: 'The schedule has been successfully removed.',
      });
  
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'An unexpected error occurred during the deletion process.',
      });
    }
  };

  const handleDeleteAllSchedules = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore not available. Please try again.',
      });
      return;
    }
    
    try {
      const schedulesCol = collection(firestore, 'schedules');
      const querySnapshot = await getDocs(schedulesCol);
      
      if (querySnapshot.empty) {
        toast({
          title: 'No Schedules to Delete',
          description: 'There are no schedules to delete.',
        });
        setIsDeleteAllConfirmOpen(false);
        return;
      }
      
      const batch = writeBatch(firestore);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      toast({
        title: 'All Schedules Deleted',
        description: 'All schedules have been successfully deleted.',
      });
    } catch (error: any) {
      console.error("Error deleting all schedules:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: `An error occurred: ${error.message}.`,
      });
    } finally {
      setIsDeleteAllConfirmOpen(false);
    }
  };
  
  const handleStatusChange = (scheduleId: string, status: string) => {
    if (!firestore) return;
    const scheduleRef = doc(firestore, 'schedules', scheduleId);
    updateDocumentNonBlocking(scheduleRef, { status });
    toast({
        title: 'Status Updated',
        description: 'The trip status has been updated.',
    });
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
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
        const date = parse(dateString, 'yyyy-MM-dd', new Date());
        return format(date, 'PPP');
    } catch (e) {
        return "Invalid Date";
    }
  };


  const isLoading = isLoadingSchedules || isLoadingShips || isLoadingRoutes || isLoadingStaff;

  const statusOptions = ['On Time', 'Delayed', 'Departed', 'Arrived', 'Cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and delete trip schedules.
          </p>
        </div>
        <div className="flex gap-2">
            <Button
                variant="destructive"
                onClick={() => setIsDeleteAllConfirmOpen(true)}
                >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
            </Button>
            <Dialog open={isBulkFormOpen} onOpenChange={setIsBulkFormOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Bulk Generate
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Bulk Generate Schedules</DialogTitle>
                        <DialogDescription>
                            Create schedules for the next 5 days for a specific route.
                        </DialogDescription>
                    </DialogHeader>
                    {firestore && (
                        <BulkScheduleForm
                            firestore={firestore}
                            ships={ships || []}
                            routes={routes || []}
                            onFinished={() => setIsBulkFormOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => setEditingSchedule(undefined)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add a New Schedule'}</DialogTitle>
                <DialogDescription>
                    Fill in the details below. Click save when you're done.
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
          <CardTitle>All Schedules</CardTitle>
          <CardDescription>A list of all upcoming trip schedules.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Live Status</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading schedules...
                  </TableCell>
                </TableRow>
              ) : schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{getRouteName(schedule.routeId)}</TableCell>
                    <TableCell>{formatDate(schedule.date)}</TableCell>
                    <TableCell>{formatTime(schedule.departureTime)}</TableCell>
                    <TableCell>
                      <Select defaultValue={schedule.status || 'On Time'} onValueChange={(value) => handleStatusChange(schedule.id, value)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                      </Select>
                    </TableCell>
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
                          onClick={() => handleDelete(schedule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No schedules found.</p>
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

      <AlertDialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete ALL schedules
                    from your database. Any active bookings associated with these schedules will NOT be deleted, which may cause issues.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteAllSchedules}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Yes, delete all schedules
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
