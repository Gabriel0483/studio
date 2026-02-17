
'use client';

import React, { useState } from 'react';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Pencil, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function TenantsManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const isPlatformAdmin = user?.email === 'rielmagpantay@gmail.com';

  const tenantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tenants'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (!isPlatformAdmin) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only the Platform Administrator can manage tenants.</p>
      </div>
    );
  }

  const handleUpdateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingTenant) return;

    const tenantRef = doc(firestore, 'tenants', editingTenant.id);
    updateDocumentNonBlocking(tenantRef, {
      name: editingTenant.name,
      contactEmail: editingTenant.contactEmail,
    });

    toast({ title: 'Tenant Updated', description: 'The operator profile has been updated.' });
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Operator Management</h1>
        <p className="text-muted-foreground">Manage all shipping companies and ferry operators on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Operators</CardTitle>
          <CardDescription>A list of all tenants using the Isla Konek SaaS platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Onboarded Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : tenants && tenants.length > 0 ? (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {tenant.name}
                    </TableCell>
                    <TableCell>{tenant.contactEmail}</TableCell>
                    <TableCell>{tenant.createdAt ? format(new Date(tenant.createdAt), 'PP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingTenant(tenant); setIsEditDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No operators registered yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Operator Profile</DialogTitle>
            <DialogDescription>Update the details for this shipping company.</DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <form onSubmit={handleUpdateTenant} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" value={editingTenant.name} onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" value={editingTenant.contactEmail} onChange={(e) => setEditingTenant({...editingTenant, contactEmail: e.target.value})} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
