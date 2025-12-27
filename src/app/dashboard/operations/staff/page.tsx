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
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';

interface Ship {
  id: string;
  name: string;
  capacity: number;
  status: string;
  vesselType: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  assignedShipId?: string;
  assignedShipName?: string;
}

const StaffForm = ({
  firestore,
  staffMember,
  ships,
  onFinished,
}: {
  firestore: Firestore;
  staffMember?: Staff;
  ships: Ship[];
  onFinished: () => void;
}) => {
  const [name, setName] = useState(staffMember?.name || '');
  const [role, setRole] = useState(staffMember?.role || '');
  const [assignedShipId, setAssignedShipId] = useState(staffMember?.assignedShipId || '');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out name and role.',
      });
      return;
    }
    
    const selectedShip = ships.find(s => s.id === assignedShipId);

    const staffData = {
      name,
      role,
      assignedShipId: assignedShipId || null,
      assignedShipName: selectedShip ? selectedShip.name : 'Unassigned',
    };

    if (staffMember) {
      const staffRef = doc(firestore, 'staff', staffMember.id);
      updateDocumentNonBlocking(staffRef, staffData);
      toast({
        title: 'Staff Updated',
        description: `Details for ${name} have been updated.`,
      });
    } else {
      const staffCol = collection(firestore, 'staff');
      addDocumentNonBlocking(staffCol, staffData);
      toast({
        title: 'Staff Added',
        description: `${name} has been added to the staff.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Staff Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
         <Select onValueChange={setRole} defaultValue={role}>
            <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Captain">Captain</SelectItem>
                <SelectItem value="First Mate">First Mate</SelectItem>
                <SelectItem value="Engineer">Engineer</SelectItem>
                <SelectItem value="Deckhand">Deckhand</SelectItem>
                <SelectItem value="Customer Service">Customer Service</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignedShipId">Assign to Ship</Label>
        <Select onValueChange={setAssignedShipId} defaultValue={assignedShipId}>
          <SelectTrigger id="assignedShipId">
            <SelectValue placeholder="Select a ship (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {ships.map((ship) => (
              <SelectItem key={ship.id} value={ship.id}>
                {ship.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{staffMember ? 'Update Staff' : 'Add Staff'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function StaffPage() {
  const firestore = useFirestore();

  const staffQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'staff');
  }, [firestore]);

  const shipsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ships');
  }, [firestore]);

  const { data: staff, isLoading: isLoadingStaff } = useCollection<Omit<Staff, 'id'>>(staffQuery);
  const { data: ships, isLoading: isLoadingShips } = useCollection<Omit<Ship, 'id'>>(shipsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>(undefined);

  const { toast } = useToast();

  const handleDelete = (staffMember: Staff) => {
    if (window.confirm(`Are you sure you want to delete ${staffMember.name}?`)) {
      const staffRef = doc(firestore, 'staff', staffMember.id);
      deleteDocumentNonBlocking(staffRef);
      toast({
        title: 'Staff Deleted',
        description: `${staffMember.name} has been removed from the staff.`,
      });
    }
  };

  const isLoading = isLoadingStaff || isLoadingShips;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and assign your staff members.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStaff(undefined)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add a New Staff Member'}</DialogTitle>
              <DialogDescription>
                Fill in the details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <StaffForm
              firestore={firestore}
              staffMember={editingStaff}
              ships={ships || []}
              onFinished={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Staff</CardTitle>
          <CardDescription>A list of all staff members in your company.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading staff...
                  </TableCell>
                </TableRow>
              ) : staff && staff.length > 0 ? (
                staff.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.role}</TableCell>
                    <TableCell>{person.assignedShipName || 'Unassigned'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingStaff(person);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(person)}
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
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No staff found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingStaff(undefined); setIsFormOpen(true); }}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add your first staff member
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
