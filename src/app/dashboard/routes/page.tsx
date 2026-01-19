'use client';

import React, { useState } from 'react';
import { collection, doc, deleteDoc } from 'firebase/firestore'; // Import deleteDoc
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
} from '@/components/ui/alert-dialog'; // Import AlertDialog
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Trash2, Route as RouteIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';

interface Route {
  id: string;
  name: string;
  departure: string;
  destination: string;
  distance: number;
  passengerTypes?: string[];
}

const RouteForm = ({
  firestore,
  route,
  onFinished,
}: {
  firestore: Firestore;
  route?: Route;
  onFinished: () => void;
}) => {
  const [name, setName] = useState(route?.name || '');
  const [departure, setDeparture] = useState(route?.departure || '');
  const [destination, setDestination] = useState(route?.destination || '');
  const [distance, setDistance] = useState(route?.distance || '');
  const [passengerTypes, setPassengerTypes] = useState<string[]>(route?.passengerTypes || ['Adult', 'Child', 'Senior']);
  const [currentPassengerType, setCurrentPassengerType] = useState('');

  const { toast } = useToast();

  const handleAddPassengerType = () => {
    if (currentPassengerType && !passengerTypes.includes(currentPassengerType)) {
      setPassengerTypes([...passengerTypes, currentPassengerType]);
      setCurrentPassengerType('');
    }
  };

  const handleRemovePassengerType = (typeToRemove: string) => {
    setPassengerTypes(passengerTypes.filter(type => type !== typeToRemove));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !departure || !destination || !distance) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
      });
      return;
    }

    const distanceNum = parseFloat(distance as string);
    if (isNaN(distanceNum)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Distance',
        description: 'Distance must be a valid number.',
      });
      return;
    }

    const routeData = { name, departure, destination, distance: distanceNum, passengerTypes };

    if (route) {
      const routeRef = doc(firestore, 'routes', route.id);
      updateDocumentNonBlocking(routeRef, routeData);
      toast({
        title: 'Route Updated',
        description: `The route "${name}" has been successfully updated.`,
      });
    } else {
      const routesCol = collection(firestore, 'routes');
      addDocumentNonBlocking(routesCol, routeData);
      toast({
        title: 'Route Added',
        description: `The route "${name}" has been successfully added.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
            <Label htmlFor="name">Route Name</Label>
            <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mainland to Island"
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="distance">Distance (miles)</Label>
            <Input
            id="distance"
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="e.g., 25"
            />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
            <Label htmlFor="departure">Departure Port</Label>
            <Input
            id="departure"
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
            placeholder="e.g., Port A"
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="destination">Destination Port</Label>
            <Input
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g., Island B"
            />
        </div>
      </div>
       <div className="space-y-2">
        <Label>Passenger Types</Label>
        <div className="flex gap-2">
          <Input
            value={currentPassengerType}
            onChange={(e) => setCurrentPassengerType(e.target.value)}
            placeholder="e.g., Student"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPassengerType();
                }
            }}
          />
          <Button type="button" onClick={handleAddPassengerType}>Add Type</Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {passengerTypes.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              {type}
              <button
                type="button"
                onClick={() => handleRemovePassengerType(type)}
                className="rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{route ? 'Update Route' : 'Add Route'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function RoutesPage() {
  const firestore = useFirestore();
  const routesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'routes');
  }, [firestore]);

  const { data: routes, isLoading } = useCollection<Omit<Route, 'id'>>(routesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | undefined>(undefined);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);

  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore || !routeToDelete) return;

    const routeRef = doc(firestore, 'routes', routeToDelete.id);
    try {
        await deleteDoc(routeRef);
        toast({
            title: 'Route Deleted',
            description: `The route "${routeToDelete.name}" has been deleted.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Deleting Route',
            description: error.message,
        });
    } finally {
        setRouteToDelete(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Route Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and delete shipping routes.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRoute(undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Edit Route' : 'Add a New Route'}</DialogTitle>
              <DialogDescription>
                Fill in the details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <RouteForm
              firestore={firestore}
              route={editingRoute}
              onFinished={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Routes</CardTitle>
          <CardDescription>A list of all available shipping routes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Name</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading routes...
                  </TableCell>
                </TableRow>
              ) : routes && routes.length > 0 ? (
                routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>{route.departure}</TableCell>
                    <TableCell>{route.destination}</TableCell>
                    <TableCell>{route.distance} mi</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingRoute(route);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRouteToDelete(route)}
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
                        <RouteIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No routes found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingRoute(undefined); setIsFormOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first route
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
    
    <AlertDialog open={!!routeToDelete} onOpenChange={(open) => !open && setRouteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the route "{routeToDelete?.name}".
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
    </>
  );
}
