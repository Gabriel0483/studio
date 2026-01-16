'use client';

import React, { useState } from 'react';
import { collection, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Pencil, Plus, Trash2, Ship as ShipIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

interface Ship {
  id: string;
  name: string;
  capacity: number;
  status: string;
  vesselType: string;
}

const ShipForm = ({
  firestore,
  ship,
  onFinished,
}: {
  firestore: Firestore;
  ship?: Ship;
  onFinished: () => void;
}) => {
  const [name, setName] = useState(ship?.name || '');
  const [capacity, setCapacity] = useState(ship?.capacity || '');
  const [status, setStatus] = useState(ship?.status || 'In Service');
  const [vesselType, setVesselType] = useState(ship?.vesselType || 'Ferry');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !capacity || !status || !vesselType) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
      });
      return;
    }

    const capacityNum = parseInt(capacity as string, 10);
    if (isNaN(capacityNum)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Capacity',
            description: 'Capacity must be a valid number.',
        });
        return;
    }

    const shipData = { name, capacity: capacityNum, status, vesselType };

    if (ship) {
      const shipRef = doc(firestore, 'ships', ship.id);
      updateDocumentNonBlocking(shipRef, shipData);
      toast({
        title: 'Ship Updated',
        description: `The ship "${name}" has been successfully updated.`,
      });
    } else {
      const shipsCol = collection(firestore, 'ships');
      addDocumentNonBlocking(shipsCol, shipData);
      toast({
        title: 'Ship Added',
        description: `The ship "${name}" has been successfully added.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="name">Ship Name</Label>
            <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Sea Serpent"
            />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="vesselType">Vessel Type</Label>
                <Select onValueChange={setVesselType} defaultValue={vesselType}>
                    <SelectTrigger id="vesselType">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Ferry">Ferry</SelectItem>
                        <SelectItem value="High-Speed Craft">High-Speed Craft</SelectItem>
                        <SelectItem value="Cargo Ship">Cargo Ship</SelectItem>
                        <SelectItem value="Yacht">Yacht</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="capacity">Passenger Capacity</Label>
                <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 250"
                />
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={setStatus} defaultValue={status}>
                <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="In Service">In Service</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Dry Dock">Dry Dock</SelectItem>
                    <SelectItem value="Out of Service">Out of Service</SelectItem>
                </SelectContent>
            </Select>
        </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{ship ? 'Update Ship' : 'Add Ship'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function ShipsPage() {
  const firestore = useFirestore();
  const shipsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ships');
  }, [firestore]);

  const { data: ships, isLoading } = useCollection<Omit<Ship, 'id'>>(shipsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | undefined>(undefined);
  const [shipToDelete, setShipToDelete] = useState<Ship | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { toast } = useToast();

  const getShipStatusVariant = (status: string) => {
    switch (status) {
      case 'In Service':
        return 'default';
      case 'Under Maintenance':
        return 'secondary';
      case 'Dry Dock':
      case 'Out of Service':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const confirmDelete = (ship: Ship) => {
    setShipToDelete(ship);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!firestore || !shipToDelete) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection or ship not found.' });
      return;
    }

    try {
      const schedulesCol = collection(firestore, 'schedules');
      const q = query(schedulesCol, where('shipId', '==', shipToDelete.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: `Cannot delete "${shipToDelete.name}" because it is assigned to ${querySnapshot.size} schedule(s). Please unassign it first.`,
          });
          return;
      }

      const shipRef = doc(firestore, 'ships', shipToDelete.id);
      await deleteDoc(shipRef);
      toast({
        title: 'Ship Deleted',
        description: `The ship "${shipToDelete.name}" has been successfully deleted.`,
      });
    } catch (error: any) {
      console.error('Error deleting ship:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsDeleteDialogOpen(false);
        setShipToDelete(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and delete ships in your fleet.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingShip(undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Ship
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingShip ? 'Edit Ship' : 'Add a New Ship'}</DialogTitle>
              <DialogDescription>
                Fill in the details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <ShipForm
              firestore={firestore}
              ship={editingShip}
              onFinished={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Ships</CardTitle>
          <CardDescription>A list of all ships in your fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ship Name</TableHead>
                <TableHead>Vessel Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading ships...
                  </TableCell>
                </TableRow>
              ) : ships && ships.length > 0 ? (
                ships.map((ship) => (
                  <TableRow key={ship.id}>
                    <TableCell className="font-medium">{ship.name}</TableCell>
                    <TableCell>{ship.vesselType}</TableCell>
                    <TableCell>{ship.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={getShipStatusVariant(ship.status) as any}>{ship.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingShip(ship);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(ship)}
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
                        <ShipIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No ships found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingShip(undefined); setIsFormOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first ship
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
     <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the ship "{shipToDelete?.name}". This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
