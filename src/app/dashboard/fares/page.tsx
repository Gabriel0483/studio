'use client';

import React, { useState, useEffect } from 'react';
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
import { Pencil, Plus, Trash2, Ticket } from 'lucide-react';
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

interface Fare {
  id: string;
  routeId: string;
  routeName: string;
  price: number;
  passengerType: string;
}

const FareForm = ({
  firestore,
  fare,
  routes,
  onFinished,
}: {
  firestore: Firestore;
  fare?: Fare;
  routes: Route[];
  onFinished: () => void;
}) => {
  const [routeId, setRouteId] = useState(fare?.routeId || '');
  const [price, setPrice] = useState(fare?.price || '');
  const [passengerType, setPassengerType] = useState(fare?.passengerType || '');
  const [availablePassengerTypes, setAvailablePassengerTypes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (routeId) {
      const selectedRoute = routes.find(r => r.id === routeId);
      const types = selectedRoute?.passengerTypes || [];
      setAvailablePassengerTypes(types);
      // Reset passengerType if it's not in the new list of available types
      if (!types.includes(passengerType)) {
        setPassengerType('');
      }
    } else {
      setAvailablePassengerTypes([]);
      setPassengerType('');
    }
  }, [routeId, routes, passengerType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !price || !passengerType) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
      });
      return;
    }

    const priceNum = parseFloat(price as string);
    if (isNaN(priceNum)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Price',
        description: 'Price must be a valid number.',
      });
      return;
    }

    const selectedRoute = routes.find(r => r.id === routeId);
    if (!selectedRoute) {
        toast({ variant: 'destructive', title: 'Invalid Route', description: 'Please select a valid route.' });
        return;
    }

    const fareData = { 
        routeId, 
        routeName: selectedRoute.name, 
        price: priceNum, 
        passengerType 
    };

    if (fare) {
      const fareRef = doc(firestore, 'fares', fare.id);
      updateDocumentNonBlocking(fareRef, fareData);
      toast({
        title: 'Fare Updated',
        description: `The fare has been successfully updated.`,
      });
    } else {
      const faresCol = collection(firestore, 'fares');
      addDocumentNonBlocking(faresCol, fareData);
      toast({
        title: 'Fare Added',
        description: `The fare has been successfully added.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="routeId">Route</Label>
            <Select onValueChange={setRouteId} defaultValue={routeId}>
                <SelectTrigger id="routeId">
                    <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                {routes.map(route => (
                    <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="passengerType">Passenger Type</Label>
                <Select onValueChange={setPassengerType} value={passengerType} disabled={!routeId}>
                    <SelectTrigger id="passengerType">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {availablePassengerTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="price">Price (₱)</Label>
                <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g., 50.00"
                />
            </div>
        </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{fare ? 'Update Fare' : 'Add Fare'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function FaresPage() {
  const firestore = useFirestore();
  const faresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'fares');
  }, [firestore]);
  const routesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'routes');
  }, [firestore]);

  const { data: fares, isLoading: isLoadingFares } = useCollection<Omit<Fare, 'id'>>(faresQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection<Omit<Route, 'id'>>(routesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFare, setEditingFare] = useState<Fare | undefined>(undefined);

  const { toast } = useToast();

  const handleDelete = (fare: Fare) => {
    if (window.confirm(`Are you sure you want to delete this fare?`)) {
      const fareRef = doc(firestore, 'fares', fare.id);
      deleteDocumentNonBlocking(fareRef);
      toast({
        title: 'Fare Deleted',
        description: `The fare has been deleted.`,
      });
    }
  };

  const isLoading = isLoadingFares || isLoadingRoutes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fare Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and delete passenger fares.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingFare(undefined)} disabled={!routes || routes.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Fare
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingFare ? 'Edit Fare' : 'Add a New Fare'}</DialogTitle>
              <DialogDescription>
                Fill in the details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <FareForm
              firestore={firestore}
              fare={editingFare}
              routes={routes || []}
              onFinished={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      {(!isLoading && !routes) || (routes && routes.length === 0) && (
        <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <div className="text-yellow-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                    </div>
                    <div>
                        <CardTitle className="text-base text-yellow-800">No Routes Found</CardTitle>
                        <p className="text-sm text-yellow-700">Please add at least one route before creating a fare.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>All Fares</CardTitle>
          <CardDescription>A list of all available passenger fares.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Name</TableHead>
                <TableHead>Passenger Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading fares...
                  </TableCell>
                </TableRow>
              ) : fares && fares.length > 0 ? (
                fares.map((fare) => (
                  <TableRow key={fare.id}>
                    <TableCell className="font-medium">{fare.routeName}</TableCell>
                    <TableCell>{fare.passengerType}</TableCell>
                    <TableCell>₱{fare.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingFare(fare);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(fare)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Ticket className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No fares found.</p>
                        <Button disabled={!routes || routes.length === 0} variant="secondary" size="sm" onClick={() => { setEditingFare(undefined); setIsFormOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first fare
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
