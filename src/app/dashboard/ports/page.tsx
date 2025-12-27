'use client';

import React, { useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
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
  DialogClose
} from '@/components/ui/dialog';
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
import { Pencil, Plus, Trash2, Warehouse } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, Firestore } from 'firebase/firestore';

interface Port {
  id: string;
  name: string;
  location: string;
}

const PortForm = ({
  firestore,
  port,
  onFinished,
}: {
  firestore: Firestore;
  port?: Port;
  onFinished: () => void;
}) => {
  const [name, setName] = useState(port?.name || '');
  const [location, setLocation] = useState(port?.location || '');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
      });
      return;
    }

    if (port) {
      const portRef = doc(firestore, 'ports', port.id);
      updateDocumentNonBlocking(portRef, { name, location });
      toast({
        title: 'Port Updated',
        description: `The port "${name}" has been successfully updated.`,
      });
    } else {
      const portsCol = collection(firestore, 'ports');
      addDocumentNonBlocking(portsCol, { name, location });
      toast({
        title: 'Port Added',
        description: `The port "${name}" has been successfully added.`,
      });
    }
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Port Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., King's Wharf"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Bermuda"
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{port ? 'Update Port' : 'Add Port'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function PortsPage() {
  const firestore = useFirestore();
  const portsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ports');
  }, [firestore]);
  
  const { data: ports, isLoading } = useCollection<Omit<Port, 'id'>>(portsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | undefined>(undefined);

  const { toast } = useToast();

  const handleDelete = (port: Port) => {
    if (window.confirm(`Are you sure you want to delete the port "${port.name}"?`)) {
      const portRef = doc(firestore, 'ports', port.id);
      deleteDocumentNonBlocking(portRef);
      toast({
        title: 'Port Deleted',
        description: `The port "${port.name}" has been deleted.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Port Management</h1>
          <p className="text-muted-foreground">
            Create, view, edit, and delete port locations.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPort(undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Port
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPort ? 'Edit Port' : 'Add a New Port'}</DialogTitle>
              <DialogDescription>
                Fill in the details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <PortForm
              firestore={firestore}
              port={editingPort}
              onFinished={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Ports</CardTitle>
          <CardDescription>A list of all available ports.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Port Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading ports...
                  </TableCell>
                </TableRow>
              ) : ports && ports.length > 0 ? (
                ports.map((port) => (
                  <TableRow key={port.id}>
                    <TableCell className="font-medium">{port.name}</TableCell>
                    <TableCell>{port.location}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPort(port);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(port)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Warehouse className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No ports found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingPort(undefined); setIsFormOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first port
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
