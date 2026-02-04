'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subDays } from 'date-fns';
import { Timestamp, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export default function DataRetentionPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();
    const [isPurging, setIsPurging] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const staffDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'staff', user.uid) : null), [firestore, user]);
    const { data: staffData, isLoading: isLoadingStaffData } = useDoc(staffDocRef);
    
    // Check for access permissions, including the super admin fallback
    const canAccess = useMemo(() => {
        if (!user) return false;
        
        // Initial Super Admin fallback (matches layout.tsx logic)
        if (user.email === 'rielmagpantay@gmail.com') return true;

        return staffData?.roles?.some((role: string) => 
            ['Super Admin', 'Operations Manager', 'Station Manager'].includes(role)
        );
    }, [user, staffData]);

    const handlePurge = async () => {
        if (!firestore) return;
        setIsConfirmOpen(false);
        setIsPurging(true);

        try {
            const ninetyDaysAgo = subDays(new Date(), 90);
            const ninetyDaysAgoTimestamp = Timestamp.fromDate(ninetyDaysAgo);

            const bookingsRef = collection(firestore, 'bookings');
            const q = query(bookingsRef, where('travelDate', '<', ninetyDaysAgoTimestamp));

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                toast({
                    title: "No Records to Purge",
                    description: "There were no booking records older than 90 days to delete.",
                });
                setIsPurging(false);
                return;
            }
            
            const batch = writeBatch(firestore);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            toast({
                title: "Purge Complete",
                description: `${querySnapshot.size} booking records older than 90 days have been permanently deleted.`,
            });
        } catch (error: any) {
            console.error("Error purging records: ", error);
            toast({
                variant: "destructive",
                title: "Purge Failed",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsPurging(false);
        }
    };
    
    if (isLoadingStaffData) {
        return (
            <div className="flex h-full min-h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Verifying permissions...</p>
            </div>
        );
    }
    
    if (!canAccess) {
        return (
            <Card className="mx-auto max-w-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-destructive" />
                        Permission Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You do not have the required permissions to access this page. This feature is available to Super Admins, Operations Managers, and Station Managers only.</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Data Retention Management</h1>
                    <p className="text-muted-foreground">
                        Tools for managing data privacy and storage.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Purge Old Booking Records</CardTitle>
                        <CardDescription>
                            Permanently delete all booking records with a travel date older than 90 days from today. This action is irreversible and helps maintain data privacy compliance.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning: Destructive Action</AlertTitle>
                            <AlertDescription>
                                This action will permanently delete data from your database. Once deleted, the records cannot be recovered. Proceed with caution.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="destructive"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={isPurging}
                        >
                            {isPurging ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Purging...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Purge Records Older Than 90 Days
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all booking records older than 90 days. This action cannot be undone and the data will be lost forever.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handlePurge}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Yes, Purge Data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
