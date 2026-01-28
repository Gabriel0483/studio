'use client';

import React, { useState } from 'react';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  setDocumentNonBlocking,
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
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Firestore } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

interface AdminUser {
  id: string; // Firestore document ID, which is the UID
  uid: string;
  email: string;
  name: string;
  roles: string[];
  assignedShipId?: string;
  assignedShipName?: string;
  assignedPortId?: string;
  assignedPortName?: string;
}

interface Port {
    id: string;
    name: string;
}

interface Ship {
    id: string;
    name: string;
}

const ROLES = ["Super Admin", "Operations Manager", "Station Manager", "Desk Booking Agent", "Crew", "Finance/Accounting"];

const UserForm = ({
  firestore,
  user,
  ports,
  ships,
  isLoadingPorts,
  isLoadingShips,
  onFinished,
}: {
  firestore: Firestore;
  user?: AdminUser;
  ports: Port[];
  ships: Ship[];
  isLoadingPorts: boolean;
  isLoadingShips: boolean;
  onFinished: () => void;
}) => {
  const [uid, setUid] = useState(user?.uid || '');
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [roles, setRoles] = useState<string[]>(user?.roles || []);
  const [assignedPortId, setAssignedPortId] = useState(user?.assignedPortId || 'none');
  const [assignedShipId, setAssignedShipId] = useState(user?.assignedShipId || 'none');
  const { toast } = useToast();
  
  const showPortAssignment = roles.includes('Desk Booking Agent') || roles.includes('Station Manager');
  const showShipAssignment = roles.includes('Crew');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !email || !name || roles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please provide UID, email, name, and at least one role.',
      });
      return;
    }

    const selectedPort = ports.find(p => p.id === assignedPortId);
    const selectedShip = ships.find(s => s.id === assignedShipId);

    const userData: any = {
        uid,
        email,
        name,
        roles,
    };
    
    if (showPortAssignment) {
        userData.assignedPortId = selectedPort ? selectedPort.id : null;
        userData.assignedPortName = selectedPort ? selectedPort.name : null;
    } else {
        userData.assignedPortId = null;
        userData.assignedPortName = null;
    }
    
    if (showShipAssignment) {
        userData.assignedShipId = selectedShip ? selectedShip.id : null;
        userData.assignedShipName = selectedShip ? selectedShip.name : null;
    } else {
        userData.assignedShipId = null;
        userData.assignedShipName = null;
    }

    const userDocRef = doc(firestore, 'staff', uid);

    if (user) {
      updateDocumentNonBlocking(userDocRef, userData);
      toast({
        title: 'User Updated',
        description: `Details for ${name} have been updated.`,
      });
    } else {
      setDocumentNonBlocking(userDocRef, userData, { merge: false });
      toast({
        title: 'User Added',
        description: `${name} has been added to the system.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-2">
        <Label htmlFor="uid">User UID</Label>
        <Input
          id="uid"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Firebase Authentication UID"
          disabled={!!user}
        />
        <p className="text-sm text-muted-foreground">The user must already have an account. You can get the UID from the Firebase Console.</p>
      </div>
       <div className="space-y-2">
        <Label htmlFor="email">User Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={!!user}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label>Roles</Label>
        <div className="space-y-2 rounded-md border p-4">
          {ROLES.map((role) => (
             <div key={role} className="flex items-center space-x-2">
                <Checkbox
                    id={`role-${role}`}
                    checked={roles.includes(role)}
                    onCheckedChange={(checked) => {
                        return checked
                        ? setRoles([...roles, role])
                        : setRoles(roles.filter((r) => r !== role))
                    }}
                />
                <label
                    htmlFor={`role-${role}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {role}
                </label>
             </div>
          ))}
        </div>
      </div>
      {showPortAssignment && (
        <div className="space-y-2">
            <Label htmlFor="assignedPortId">Assigned Port</Label>
            <Select onValueChange={setAssignedPortId} defaultValue={assignedPortId}>
                <SelectTrigger id="assignedPortId" disabled={isLoadingPorts}>
                    <SelectValue placeholder={isLoadingPorts ? "Loading ports..." : "No assigned port"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No assigned port</SelectItem>
                    {ports?.map((port) => <SelectItem key={port.id} value={port.id}>{port.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Assign a port for location-based access control for Desk Booking Agents.</p>
        </div>
      )}

      {showShipAssignment && (
        <div className="space-y-2">
            <Label htmlFor="assignedShipId">Assigned Ship</Label>
            <Select onValueChange={setAssignedShipId} defaultValue={assignedShipId}>
                <SelectTrigger id="assignedShipId" disabled={isLoadingShips}>
                    <SelectValue placeholder={isLoadingShips ? "Loading ships..." : "No assigned ship"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No assigned ship</SelectItem>
                    {ships?.map((ship) => <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Assign a ship for crew members.</p>
        </div>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{user ? 'Update User' : 'Add User'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function UsersPage() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'staff');
  }, [firestore]);
  
  const portsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ports');
  }, [firestore]);

  const shipsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ships');
  }, [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<Omit<AdminUser, 'id'>>(usersQuery);
  const { data: ports, isLoading: isLoadingPorts } = useCollection<Omit<Port, 'id'>>(portsQuery);
  const { data: ships, isLoading: isLoadingShips } = useCollection<Omit<Ship, 'id'>>(shipsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>(undefined);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore || !userToDelete) return;
    try {
      const userRef = doc(firestore, 'staff', userToDelete.id);
      await deleteDoc(userRef);
      toast({
        title: 'User Deleted',
        description: `${userToDelete.name} has been removed from the system.`,
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setUserToDelete(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Add admin users and assign their roles and permissions.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(undefined)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add a New User'}</DialogTitle>
              <DialogDescription>
                Fill in the user's details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <UserForm
              firestore={firestore}
              user={editingUser}
              ports={ports || []}
              ships={ships || []}
              isLoadingPorts={isLoadingPorts}
              isLoadingShips={isLoadingShips}
              onFinished={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Admin Users</CardTitle>
          <CardDescription>A list of all users with access to the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Assigned Port</TableHead>
                <TableHead>Assigned Ship</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users && users.length > 0 ? (
                users.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell className="space-x-1">
                        {person.roles?.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                    </TableCell>
                    <TableCell>{person.assignedPortName || 'N/A'}</TableCell>
                    <TableCell>{person.assignedShipName || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingUser(person);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setUserToDelete(person)}
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
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No admin users found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingUser(undefined); setIsFormOpen(true); }}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add your first user
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
    <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the user "{userToDelete?.name}". This action cannot be undone.
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
