'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertCircle, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, getDocs, updateDoc, Timestamp, runTransaction, orderBy } from "firebase/firestore";
import React, { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function RebookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedBooking, setSearchedBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [cancellationFee, setCancellationFee] = useState(0);
  const [cancellationReason, setCancellationReason] = useState('');

  const staffDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'staff', user.uid) : null), [firestore, user]);
  const { data: staffData } = useDoc(staffDocRef);

  const finalRefundAmount = useMemo(() => {
    if (!searchedBooking) return 0;
    return searchedBooking.totalPrice - cancellationFee;
  }, [searchedBooking, cancellationFee]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !searchQuery || !user) {
      toast({ variant: "destructive", title: "Search Blocked", description: "Please enter a search term." });
      return;
    }

    setIsLoading(true);
    setSearchedBooking(null);
    setSearchPerformed(true);

    try {
      const isPlatformAdmin = ['rielmagpantay@gmail.com', 'mariel.dumaoal@gmail.com'].includes(user.email || '');
      const roles = staffData?.roles || [];
      const isFullAccess = roles.some(r => ['Super Admin', 'Operations Manager', 'Finance/Accounting'].includes(r)) || isPlatformAdmin;

      const bookingsRef = collection(firestore, "bookings");
      let q;

      if (isFullAccess) {
        q = query(bookingsRef, where('id', '==', searchQuery.toUpperCase()));
      } else if (staffData?.assignedPortName) {
        q = query(bookingsRef, where('departurePortName', '==', staffData.assignedPortName));
      } else {
        throw new Error("You do not have permission to search bookings.");
      }

      const querySnapshot = await getDocs(q);
      const allBookings = querySnapshot.docs.map(doc => ({...doc.data(), firestoreId: doc.id}) as any);

      const searchTerm = searchQuery.toLowerCase();
      const foundBooking = allBookings.find((booking: any) => {
        const idMatch = booking.id.toLowerCase() === searchTerm || booking.id.toLowerCase().includes(searchTerm);
        const passengerMatch = (booking.passengerInfo || []).some((p: any) => p.fullName.toLowerCase().includes(searchTerm));
        return idMatch || passengerMatch;
      });

      setSearchedBooking(foundBooking || null);

    } catch (error: any) {
      console.error("Error searching for booking: ", error);
      toast({ variant: "destructive", title: "Search Failed", description: error.message || "Failed to search for booking." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!firestore || !searchedBooking) return;
    setIsLoading(true);

    // Prepare waitlist pass
    const waitlistQuery = query(
        collection(firestore, 'bookings'),
        where('scheduleId', '==', searchedBooking.scheduleId),
        where('status', '==', 'Waitlisted'),
        orderBy('bookingDate', 'asc')
    );
    const waitlistSnap = await getDocs(waitlistQuery);

    try {
        await runTransaction(firestore, async (transaction) => {
            const bookingRef = doc(firestore, 'bookings', searchedBooking.firestoreId);
            const scheduleRef = doc(firestore, 'schedules', searchedBooking.scheduleId);
            
            const scheduleDoc = await transaction.get(scheduleRef);
            if (!scheduleDoc.exists()) return;
            
            let currentSeats = scheduleDoc.data().availableSeats || 0;
            let currentWaitlistCount = scheduleDoc.data().waitlistCount || 0;

            const updateData: any = {
                status: 'Refunded',
                paymentStatus: 'Refunded',
                refundStatus: 'Refunded',
                refundAmount: finalRefundAmount,
                cancellationFee: cancellationFee,
                cancellationReason: cancellationReason,
            };

            if (searchedBooking.status === 'Reserved' || searchedBooking.status === 'Confirmed') {
                currentSeats += searchedBooking.numberOfSeats;

                // AUTOMATIC PROMOTION PASS
                for (const wDoc of waitlistSnap.docs) {
                    const wData = wDoc.data();
                    if (wData.numberOfSeats <= currentSeats) {
                        transaction.update(wDoc.ref, { status: 'Reserved' });
                        currentSeats -= wData.numberOfSeats;
                        currentWaitlistCount = Math.max(0, currentWaitlistCount - wData.numberOfSeats);
                    }
                }
            } else if (searchedBooking.status === 'Waitlisted') {
                currentWaitlistCount = Math.max(0, currentWaitlistCount - searchedBooking.numberOfSeats);
            }
            
            transaction.update(scheduleRef, { 
                availableSeats: currentSeats,
                waitlistCount: currentWaitlistCount
            });
            transaction.update(bookingRef, updateData);
        });

        setSearchedBooking((prev: any) => ({
            ...prev,
            status: 'Refunded',
            paymentStatus: 'Refunded',
            refundStatus: 'Refunded',
            refundAmount: finalRefundAmount,
            cancellationFee: cancellationFee,
            cancellationReason: cancellationReason,
        }));

        toast({ title: "Refund Processed", description: `Refund processed and waitlist promoted.` });

    } catch (error) {
        console.error("Error processing refund: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to process refund." });
    } finally {
        setIsLoading(false);
        setIsRefundDialogOpen(false);
        setCancellationFee(0);
        cancellationReason && setCancellationReason('');
    }
  };


  const handleRebook = () => {
    if (!searchedBooking) return;
    router.push(`/dashboard/bookings/${searchedBooking.id}/edit`);
  };
  
  const formatDate = (timestamp: Timestamp | undefined, dateFormat = 'PPP') => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), dateFormat);
  };
  
  const isRefundable = searchedBooking?.paymentStatus === 'Paid' && !['Refunded', 'Completed'].includes(searchedBooking?.status);
  const isRebookable = searchedBooking && !['Cancelled', 'Refunded', 'Completed'].includes(searchedBooking?.status);

  return (
    <>
    <div className="space-y-6">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Rebooking & Refunds</CardTitle>
          <CardDescription>Find a booking to manage refunds or rebooking requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Search by Booking Ref or Passenger Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Find Booking
            </Button>
          </form>
        </CardContent>
        {isLoading && (
          <CardFooter>
            <div className="flex w-full justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2">Searching for booking...</p>
            </div>
          </CardFooter>
        )}
        
        {!isLoading && searchPerformed && !searchedBooking && (
            <CardFooter>
                 <div className="w-full text-center py-8">
                    <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Booking Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">We couldn't find a booking matching your search criteria.</p>
                </div>
            </CardFooter>
        )}

        {!isLoading && searchedBooking && (
          <>
            <CardContent className="pt-6">
                <h3 className="text-xl font-bold tracking-tight">Booking Details</h3>
                <Separator className="my-4" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="font-semibold text-muted-foreground">Booking Ref</p>
                            <p className="font-mono">{searchedBooking.id}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground">Route</p>
                            <p>{searchedBooking.routeName}</p>
                        </div>
                         <div>
                            <p className="font-semibold text-muted-foreground">Travel Date</p>
                            <p>{formatDate(searchedBooking.travelDate)}</p>
                        </div>
                         <div>
                            <p className="font-semibold text-muted-foreground">Booking Status</p>
                            <div><Badge variant={searchedBooking.status === 'Cancelled' || searchedBooking.status === 'Refunded' ? 'destructive' : 'default'}>{searchedBooking.status}</Badge></div>
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground">Payment Status</p>
                            <div><Badge variant={searchedBooking.paymentStatus === 'Paid' ? 'default' : 'secondary'}>{searchedBooking.paymentStatus}</Badge></div>
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground">Refund Status</p>
                            <div><Badge variant={searchedBooking.refundStatus === 'Refunded' ? 'default' : 'secondary'}>{searchedBooking.refundStatus || 'Not Applicable'}</Badge></div>
                        </div>
                    </div>
                     <Separator className="my-4" />
                     <div>
                        <p className="font-semibold text-muted-foreground">Passenger(s)</p>
                        <p>{searchedBooking.passengerInfo?.map((p: any) => p.fullName).join(', ')}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">Total Price Paid</p>
                        <p className="font-bold">₱{searchedBooking.totalPrice.toFixed(2)}</p>
                    </div>
                    {searchedBooking.cancellationFee > 0 && (
                        <div>
                            <p className="font-semibold text-muted-foreground">Cancellation Fee Applied</p>
                            <p className="font-bold text-destructive">- ₱{searchedBooking.cancellationFee.toFixed(2)}</p>
                        </div>
                    )}
                    {searchedBooking.refundAmount > 0 && (
                        <div>
                            <p className="font-semibold text-muted-foreground">Amount Refunded</p>
                            <p className="font-bold">₱{searchedBooking.refundAmount.toFixed(2)}</p>
                        </div>
                    )}
                    {searchedBooking.cancellationReason && (
                         <div className="sm:col-span-3">
                            <p className="font-semibold text-muted-foreground">Cancellation Reason</p>
                            <p>{searchedBooking.cancellationReason}</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2 justify-end bg-muted/50 py-4">
                <Button variant="secondary" onClick={() => setIsRefundDialogOpen(true)} disabled={!isRefundable || isLoading}>
                    Process Refund
                </Button>
                <Button onClick={handleRebook} disabled={!isRebookable || isLoading}>
                    Rebook
                </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>

    <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Process Refund for Booking #{searchedBooking?.id}</DialogTitle>
                <DialogDescription>
                    Enter a cancellation fee and reason if applicable. The final refund amount will be calculated.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Price Paid:</span>
                    <span className="font-medium">₱{searchedBooking?.totalPrice.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cancellation-fee">Cancellation Fee (₱)</Label>
                    <Input id="cancellation-fee" type="number" value={cancellationFee} onChange={(e) => setCancellationFee(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cancellation-reason">Reason for Cancellation</Label>
                    <Textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
                </div>
                 <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Final Refund Amount:</span>
                    <span>₱{finalRefundAmount.toFixed(2)}</span>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleProcessRefund} disabled={isLoading}>Confirm Refund</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
