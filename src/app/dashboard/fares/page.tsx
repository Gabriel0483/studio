'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, deleteDoc, query, where, Firestore } from 'firebase/firestore';
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
import { Pencil, Plus, Trash2, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/components/dashboard/tenant-context';

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
  tenantId: string;
  routeId: string;
  routeName: string;
  price: number;
  passengerType: string;
}

const FareForm = ({
  firestore,
  tenantId,
  fare,
  routes,
  onFinished,
}: {
  firestore: Firestore;
  tenantId: string;
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
        passengerType,
        tenantId
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
  const { tenantId } = useTenant();

  const faresQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'fares'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId]);

  const routesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'routes'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId]);

  const { data: fares, isLoading: isLoadingFares } = useCollection<Omit<Fare, 'id'>>(faresQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection<Omit<Route, 'id'>>(routesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFare, setEditingFare] = useState<Fare | undefined>(undefined);
  const [fareToDelete, setFareToDelete] = useState<Fare | null>(null);
  const [filterRouteId, setFilterRouteId] = useState('all');

  const { toast } = useToast();

  const filteredFares = useMemo(() => {
    if (!fares) return [];
    if (filterRouteId === 'all') return fares;
    return fares.filter(fare => fare.routeId === filterRouteId);
  }, [fares, filterRouteId]);

  const handleDelete = async () => {
    if (!firestore || !fareToDelete) return;
    const fareRef = doc(firestore, 'fares', fareToDelete.id);
    try {
        await deleteDoc(fareRef);
        toast({
            title: 'Fare Deleted',
            description: 'The fare has been successfully deleted.',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Deleting Fare',
            description: error.message,
        });
    } finally {
        setFareToDelete(null);
    }
  };

  const isLoading = isLoadingFares || isLoadingRoutes;

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fare Management</h1>
          <p className="text-muted-foreground">
            Manage pricing for your operator's routes.
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
            {tenantId && (
              <FareForm
                firestore={firestore}
                tenantId={tenantId}
                fare={editingFare}
                routes={routes || []}
                onFinished={() => setIsFormOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      {(!isLoading && (!routes || routes.length === 0)) && (
        <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <div className="text-yellow-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                    </div>
                    <div>
                        <CardTitle className="text-base text-yellow-800">No Routes Found</CardTitle>
                        <p className="text-sm text-yellow-700">Please add your operator's routes before creating fares.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Your Fares</CardTitle>
          <CardDescription>A breakdown of your operator's passenger pricing.</CardDescription>
            <div className="pt-4">
                <Label htmlFor="filter-route">Filter by Route</Label>
                <Select value={filterRouteId} onValueChange={setFilterRouteId}>
                    <SelectTrigger id="filter-route" className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Select a route to filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Routes</SelectItem>
                        {routes?.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                                {route.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
              ) : filteredFares && filteredFares.length > 0 ? (
                filteredFares.map((fare) => (
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
                          onClick={() => setFareToDelete(fare)}
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
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <AlertDialog open={!!fareToDelete} onOpenChange={(open) => !open && setFareToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fare.
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
