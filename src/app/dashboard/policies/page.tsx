'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
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
import { Pencil, Plus, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Firestore, Timestamp } from 'firebase/firestore';

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Timestamp;
}

const PolicyForm = ({
  firestore,
  policy,
  onFinished,
}: {
  firestore: Firestore;
  policy?: Policy;
  onFinished: () => void;
}) => {
  const [title, setTitle] = useState(policy?.title || '');
  const [content, setContent] = useState(policy?.content || '');
  const [category, setCategory] = useState(policy?.category || '');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
      });
      return;
    }

    const policyData = {
      title,
      content,
      category,
      createdAt: policy?.createdAt ? policy.createdAt : serverTimestamp(),
    };

    if (policy) {
      const policyRef = doc(firestore, 'policies', policy.id);
      updateDocumentNonBlocking(policyRef, policyData);
      toast({
        title: 'Policy Updated',
        description: `The policy has been successfully updated.`,
      });
    } else {
      const policiesCol = collection(firestore, 'policies');
      addDocumentNonBlocking(policiesCol, policyData);
      toast({
        title: 'Policy Added',
        description: `The policy has been successfully posted.`,
      });
    }
    onFinished();
  };
  
  const categories = ["Booking Policy", "Terms of Service", "Privacy Policy", "General"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Privacy Policy"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={setCategory} defaultValue={category}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter the full text of the policy here."
          rows={10}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{policy ? 'Update Policy' : 'Post Policy'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function PoliciesPage() {
  const firestore = useFirestore();
  const policiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'policies'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: policies, isLoading } = useCollection<Omit<Policy, 'id'>>(policiesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | undefined>(undefined);

  const { toast } = useToast();

  const handleDelete = (policy: Policy) => {
    if (window.confirm(`Are you sure you want to delete this policy?`)) {
      if (!firestore) return;
      const policyRef = doc(firestore, 'policies', policy.id);
      deleteDocumentNonBlocking(policyRef);
      toast({
        title: 'Policy Deleted',
        description: `The policy has been deleted.`,
      });
    }
  };
  
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP p');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Policies</h1>
          <p className="text-muted-foreground">
            Manage your terms of service, booking conditions, and privacy policies.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPolicy(undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Post a New Policy'}</DialogTitle>
              <DialogDescription>
                Fill in the details below. This will be visible to the public immediately.
              </DialogDescription>
            </DialogHeader>
            {firestore && (
              <PolicyForm
                firestore={firestore}
                policy={editingPolicy}
                onFinished={() => setIsFormOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Policies</CardTitle>
          <CardDescription>A list of all posted policies, sorted by most recent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date Posted</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading policies...
                  </TableCell>
                </TableRow>
              ) : policies && policies.length > 0 ? (
                policies.map((pol) => (
                  <TableRow key={pol.id}>
                    <TableCell className="font-medium">{pol.title}</TableCell>
                    <TableCell>{pol.category}</TableCell>
                    <TableCell>{formatDate(pol.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPolicy(pol);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(pol)}
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
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No policies found.</p>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingPolicy(undefined); setIsFormOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Post your first policy
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

    