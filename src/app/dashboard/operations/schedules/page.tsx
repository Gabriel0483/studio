'use client';

import React, { useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
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
import { Pencil, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import { Badge } from '@/components/ui/badge';


interface Ship {
  id: string;
  name: string;
}

interface Route {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  shipId?: string;
  shipName?: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  tripType: 'Daily' | 'Special';
}

const ScheduleForm = ({
  firestore,
  schedule,
  ships,
  routes,
  onFinished,
}: {
  firestore: Firestore;
  schedule?: Schedule;
  ships: Ship[];
  routes: Route[];
  onFinished: () => void;
}) => {
  const [shipId, setShipId] = useState(schedule?.shipId || 'unassigned');
  const [routeId, setRouteId] = useState(schedule?.routeId || '');
  const [departureTime, setDepartureTime] = useState(schedule?.departureTime || '');
  const [arrivalTime, setArrivalTime] = useState(schedule?.arrivalTime || '');
  const [availableSeats, setAvailableSeats] = useState(schedule?.availableSeats || '');
  const [tripType, setTripType] = useState<'Daily' | 'Special'>(schedule?.tripType || 'Daily');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !departureTime || !arrivalTime || !availableSeats || !tripType) {
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
      departureTime,
      arrivalTime,
      availableSeats: seatsNum,
      tripType,
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
            <Label htmlFor="routeId">Route</Label>
            <Select onValueChange={setRouteId} defaultValue={routeId}>
                <SelectTrigger id="routeId"><SelectValue placeholder="Select a route" /></SelectTrigger>
                <SelectContent>
                    {routes.map((route) => <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>)}
                </SelectContent>
            </Select>
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
            <Label htmlFor="availableSeats">Available Seats</Label>
            <Input
            id="availableSeats"
            type="number"
            value={availableSeats}
            onChange={(e) => setAvailableSeats(e.target.value)}
            placeholder="e.g., 150"
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="tripType">Trip Type</Label>
            <Select onValueChange={(value: 'Daily' | 'Special') => setTripType(value)} defaultValue={tripType}>
                <SelectTrigger id="tripType"><SelectValue placeholder="Select a trip type" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Special">Special</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
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
  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const shipsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]);
  const routesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);

  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<Omit<Schedule, 'id'>>(schedulesQuery);
  const { data: ships, isLoading: isLoadingShips } = useCollection<Omit<Ship, 'id'>>(shipsQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection<Omit<Route, 'id'>>(routesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>(undefined);

  const { toast } = useToast();

  const handleDelete = (schedule: Schedule) => {
    if (window.confirm(`Are you sure you want to delete this schedule?`)) {
      if (!firestore) return;
      const scheduleRef = doc(firestore, 'schedules', schedule.id);
      deleteDocumentNonBlocking(scheduleRef);
      toast({
        title: 'Schedule Deleted',
        description: `The schedule has been deleted.`,
      });
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

  const isLoading = isLoadingSchedules || isLoadingShips || isLoadingRoutes;

  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';
  
  const getTripTypeVariant = (tripType: string) => {
    switch (tripType) {
      case 'Daily':
        return 'secondary';
      case 'Special':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and delete trip schedules.
          </p>
        </div>
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
                onFinished={() => setIsFormOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
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
                <TableHead>Ship</TableHead>
                <TableHead>Trip Type</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading schedules...
                  </TableCell>
                </TableRow>
              ) : schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{getRouteName(schedule.routeId)}</TableCell>
                    <TableCell>{schedule.shipName || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Badge variant={getTripTypeVariant(schedule.tripType) as any}>
                        {schedule.tripType}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTime(schedule.departureTime)}</TableCell>
                    <TableCell>{formatTime(schedule.arrivalTime)}</TableCell>
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
                  <TableCell colSpan={7} className="h-24 text-center">
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
    </div>
  );
}
