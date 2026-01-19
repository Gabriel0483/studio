
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
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
import { Pencil, Plus, Trash2, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Firestore, Timestamp } from 'firebase/firestore';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Timestamp;
}

const AnnouncementForm = ({
  firestore,
  announcement,
  onFinished,
}: {
  firestore: Firestore;
  announcement?: Announcement;
  onFinished: () => void;
}) => {
  const [title, setTitle] = useState(announcement?.title || '');
  const [content, setContent] = useState(announcement?.content || '');
  const [category, setCategory] = useState(announcement?.category || '');
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

    const announcementData = {
      title,
      content,
      category,
      createdAt: announcement?.createdAt ? announcement.createdAt : serverTimestamp(),
    };

    if (announcement) {
      const announcementRef = doc(firestore, 'announcements', announcement.id);
      updateDocumentNonBlocking(announcementRef, announcementData);
      toast({
        title: 'Announcement Updated',
        description: `The announcement has been successfully updated.`,
      });
    } else {
      const announcementsCol = collection(firestore, 'announcements');
      addDocumentNonBlocking(announcementsCol, announcementData);
      toast({
        title: 'Announcement Added',
        description: `The announcement has been successfully posted.`,
      });
    }
    onFinished();
  };
  
  const categories = ["General Information", "Weather Update", "Route Change", "Fare Change", "Service Disruption"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Service Update"
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
          placeholder="Enter the full text of the announcement here."
          rows={5}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">{announcement ? 'Update Announcement' : 'Post Announcement'}</Button>
      </DialogFooter>
    </form>
  );
};

export default function AnnouncementsPage() {
  const firestore = useFirestore();
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection<Omit<Announcement, 'id'>>(announcementsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore || !announcementToDelete) return;

    const announcementRef = doc(firestore, 'announcements', announcementToDelete.id);

    try {
      await deleteDoc(announcementRef);
      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been successfully deleted.',
      });
    } catch (error: any) {
      console.error("Deletion failed:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Could not delete the announcement.',
      });
    } finally {
      setAnnouncementToDelete(null);
    }
  };
  
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP p');
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Public Announcements</h1>
            <p className="text-muted-foreground">
              Create, view, and manage all public advisories.
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAnnouncement(undefined)}>
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Post a New Announcement'}</DialogTitle>
                <DialogDescription>
                  Fill in the details below. This will be visible to the public immediately.
                </DialogDescription>
              </DialogHeader>
              {firestore && (
                <AnnouncementForm
                  firestore={firestore}
                  announcement={editingAnnouncement}
                  onFinished={() => setIsFormOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Announcements</CardTitle>
            <CardDescription>A list of all posted advisories, sorted by most recent.</CardDescription>
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
                      Loading announcements...
                    </TableCell>
                  </TableRow>
                ) : announcements && announcements.length > 0 ? (
                  announcements.map((ann) => (
                    <TableRow key={ann.id}>
                      <TableCell className="font-medium">{ann.title}</TableCell>
                      <TableCell>{ann.category}</TableCell>
                      <TableCell>{formatDate(ann.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingAnnouncement(ann);
                              setIsFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setAnnouncementToDelete(ann)}
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
                        <Megaphone className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No announcements found.</p>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingAnnouncement(undefined); setIsFormOpen(true); }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Post your first announcement
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

      <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the announcement: "{announcementToDelete?.title}". This action cannot be undone.
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
