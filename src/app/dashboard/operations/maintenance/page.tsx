'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, deleteDoc, Timestamp, updateDoc } from 'firebase/firestore';
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
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';
import { format } from 'date-fns';

interface Ship {
  id: string;
  name: string;
}

interface MaintenanceRecord {
  id: string;
  shipId: string;
  shipName: string;
  startDate: Timestamp;
  endDate: Timestamp;
  description: string;
}

const MaintenanceForm = ({
  firestore,
  record,
  ships,
  onFinished,
}: {
  firestore: Firestore;
  record?: MaintenanceRecord;
  ships: Ship[];
  onFinished: () => void;
}) => {
  const [shipId, setShipId] = useState(record?.shipId || '');
  const [startDate, setStartDate] = useState(record?.startDate ? format(record.startDate.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
  const [endDate, setEndDate] = useState(record?.endDate ? format(record.endDate.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
  const [description, setDescription] = useState(record?.description || '');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipId || !startDate || !endDate || !description) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all fields.',
        });
        return;
    }

    const selectedShip = ships.find(s => s.id === shipId);
    if (!selectedShip) {
        toast({ variant: 'destructive', title: 'Invalid Ship', description: 'Please select a valid ship.'});
        return;
    }
    
    const startTimestamp = Timestamp.fromDate(new Date(startDate));
    const endTimestamp = Timestamp.fromDate(new Date(endDate));

    if (startTimestamp.toMillis() >= endTimestamp.toMillis()) {
        toast({ variant: 'destructive', title: 'Invalid Dates', description: 'Start date must be before the end date.' });
        return;
    }

    const recordData = {
      shipId,
      shipName: selectedShip.name,
      startDate: startTimestamp,
      endDate: endTimestamp,
      description,
    };

    try {
        const shipRef = doc(firestore, 'ships', shipId);
        // Set ship status to 'Under Maintenance'
        await updateDoc(shipRef, { status: 'Under Maintenance' });
        
        if (record) {
          const recordRef = doc(firestore, 'maintenanceRecords', record.id);
          updateDocumentNonBlocking(recordRef, recordData);
          toast({
            title: 'Maintenance Updated',
            description: `The record has been successfully updated.`,
          });
        } else {
          const recordsCol = collection(firestore, 'maintenanceRecords');
          addDocumentNonBlocking(recordsCol, recordData);
          toast({
            title: 'Maintenance Scheduled',
            description: `The maintenance has been scheduled for "${selectedShip.name}".`,
          });
        }
        onFinished();
    } catch (error) {
        console.error("Error submitting maintenance record: ", error);
        toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save the maintenance record.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-2">
            <Label htmlFor="shipId">Ship</Label>
            <Select onValueChange={setShipId} defaultValue={shipId}>
                <SelectTrigger id="shipId"><SelectValue placeholder="Select a ship" /></SelectTrigger>
                <SelectContent>
                    {ships.map((ship) => <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date & Time</Label>
          <Input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date & Time</Label>
          <Input id="endDate" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description of Maintenance</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Engine overhaul, hull inspection" />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{record ? 'Update Record' : 'Schedule Maintenance'}</Button>
      </DialogFooter>
    </form>
  );
};


export default function MaintenancePage() {
  const firestore = useFirestore();
  const recordsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'maintenanceRecords') : null, [firestore]);
  const shipsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]);
  
  const { data: records, isLoading: isLoadingRecords } = useCollection<Omit<MaintenanceRecord, 'id'>>(recordsQuery);
  const { data: ships, isLoading: isLoadingShips } = useCollection<Omit<Ship, 'id'>>(shipsQuery);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);

  const { toast } = useToast();
  
  useEffect(() => {
    if (!firestore || !records) return;
    const now = new Date();
    records.forEach(async (record) => {
        if (record.endDate.toDate() < now) {
            const shipRef = doc(firestore, 'ships', record.shipId);
            await updateDoc(shipRef, { status: 'In Service' });
        }
    });
  }, [records, firestore]);

  const handleDelete = async () => {
    if (!firestore || !recordToDelete) return;
    const recordRef = doc(firestore, 'maintenanceRecords', recordToDelete.id);
    try {
        await deleteDoc(recordRef);
        toast({
            title: 'Record Deleted',
            description: 'The maintenance record has been successfully deleted.',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Deleting Record',
            description: error.message,
        });
    } finally {
        setRecordToDelete(null);
    }
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP p');
  }

  const isLoading = isLoadingRecords || isLoadingShips;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Maintenance Records</h1>
            <p className="text-muted-foreground">
              Schedule and track all ship maintenance activities.
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRecord(undefined)}>
                <Plus className="mr-2 h-4 w-4" />
                New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Maintenance Record' : 'Schedule New Maintenance'}</DialogTitle>
                <DialogDescription>
                  Fill in the details below. This will automatically update the ship's status.
                </DialogDescription>
              </DialogHeader>
              <MaintenanceForm
                firestore={firestore}
                record={editingRecord}
                ships={ships || []}
                onFinished={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Maintenance Records</CardTitle>
            <CardDescription>A log of all scheduled and completed maintenance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ship Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading records...</TableCell>
                  </TableRow>
                ) : records && records.length > 0 ? (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.shipName}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{record.description}</TableCell>
                      <TableCell>{formatDate(record.startDate)}</TableCell>
                      <TableCell>{formatDate(record.endDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingRecord(record);
                              setIsFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRecordToDelete(record)}
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
                        <Wrench className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No maintenance records found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingRecord(undefined); setIsFormOpen(true); }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Schedule your first maintenance
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

       <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this maintenance record. This action cannot be undone.
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
