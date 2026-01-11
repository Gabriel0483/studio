
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertCircle, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { collection, doc, query, where, getDocs, updateDoc, Timestamp, runTransaction } from "firebase/firestore";
import React, { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function RebookingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedBooking, setSearchedBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [cancellationFee, setCancellationFee] = useState(0);

  const finalRefundAmount = useMemo(() => {
    if (!searchedBooking) return 0;
    return searchedBooking.totalPrice - cancellationFee;
  }, [searchedBooking, cancellationFee]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !searchQuery) {
      toast({
        variant: "destructive",
        title: "Missing Search Term",
        description: "Please enter a booking reference or passenger name.",
      });
      return;
    }

    setIsLoading(true);
    setSearchedBooking(null);
    setSearchPerformed(true);

    try {
      const bookingsRef = collection(firestore, "bookings");
      
      const qById = query(bookingsRef, where('id', '==', searchQuery.toUpperCase()));
      const byIdSnapshot = await getDocs(qById);

      if (!byIdSnapshot.empty) {
        const bookingDoc = byIdSnapshot.docs[0];
        setSearchedBooking({ ...bookingDoc.data(), firestoreId: bookingDoc.id });
      } else {
        const allBookingsSnapshot = await getDocs(bookingsRef);
        let foundBooking = null;
        for (const doc of allBookingsSnapshot.docs) {
          const bookingData = doc.data();
          const passengers = bookingData.passengerInfo || [];
          if (passengers.some((p: any) => p.fullName.toLowerCase().includes(searchQuery.toLowerCase()))) {
            foundBooking = { ...bookingData, firestoreId: doc.id };
            break; 
          }
        }
        setSearchedBooking(foundBooking);
      }
    } catch (error) {
      console.error("Error searching for booking: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to search for booking. Please try again.",
      });
      setSearchedBooking(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!firestore || !searchedBooking) return;
    setIsLoading(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const bookingRef = doc(firestore, 'bookings', searchedBooking.firestoreId);
            const scheduleRef = doc(firestore, 'schedules', searchedBooking.scheduleId);
            
            const scheduleDoc = await transaction.get(scheduleRef);
            
            const updateData: any = {
                status: 'Refunded',
                paymentStatus: 'Refunded',
                refundStatus: 'Refunded',
                refundAmount: finalRefundAmount,
                cancellationFee: cancellationFee,
            };

            if ((searchedBooking.status === 'Reserved' || searchedBooking.status === 'Confirmed') && scheduleDoc.exists()) {
                const currentSeats = scheduleDoc.data().availableSeats || 0;
                transaction.update(scheduleRef, { availableSeats: currentSeats + searchedBooking.numberOfSeats });
            }
            
            transaction.update(bookingRef, updateData);
        });

        // Refresh booking state locally after transaction
        setSearchedBooking((prev: any) => ({
            ...prev,
            status: 'Refunded',
            paymentStatus: 'Refunded',
            refundStatus: 'Refunded',
            refundAmount: finalRefundAmount,
            cancellationFee: cancellationFee,
        }));

        toast({
            title: "Refund Processed",
            description: `Refund for booking #${searchedBooking.id} has been processed and status is now Refunded.`,
        });

    } catch (error) {
        console.error("Error processing refund: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process refund.",
        });
    } finally {
        setIsLoading(false);
        setIsRefundDialogOpen(false);
        setCancellationFee(0);
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
  
  const isRefundable = searchedBooking?.paymentStatus === 'Paid' && searchedBooking?.status !== 'Refunded';

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
                        <p className="font-semibold text-muted-foreground">Total Price</p>
                        <p className="font-bold">₱{searchedBooking.totalPrice.toFixed(2)}</p>
                    </div>
                    {searchedBooking.cancellationFee > 0 && (
                        <div>
                            <p className="font-semibold text-muted-foreground">Cancellation Fee Applied</p>
                            <p className="font-bold text-destructive">₱{searchedBooking.cancellationFee.toFixed(2)}</p>
                        </div>
                    )}
                    {searchedBooking.refundAmount > 0 && (
                        <div>
                            <p className="font-semibold text-muted-foreground">Amount Refunded</p>
                            <p className="font-bold">₱{searchedBooking.refundAmount.toFixed(2)}</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2 justify-end bg-muted/50 py-4">
                <Button variant="secondary" onClick={() => setIsRefundDialogOpen(true)} disabled={!isRefundable || isLoading}>
                    Process Refund
                </Button>
                <Button onClick={handleRebook} disabled={isLoading || searchedBooking.status === 'Cancelled' || searchedBooking.status === 'Refunded'}>
                    Rebook
                </Button>
            </CardFooter>
             {isRefundable && (
                <CardFooter>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>This booking is eligible for a refund.</span>
                    </div>
                </CardFooter>
            )}
          </>
        )}
      </Card>
    </div>

    <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Process Refund for Booking #{searchedBooking?.id}</DialogTitle>
                <DialogDescription>
                    Enter a cancellation fee if applicable. The final refund amount will be calculated. To issue a full refund, leave the fee as 0.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-medium">₱{searchedBooking?.totalPrice.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cancellation-fee">Cancellation Fee (₱)</Label>
                    <Input
                        id="cancellation-fee"
                        type="number"
                        value={cancellationFee}
                        onChange={(e) => setCancellationFee(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                    />
                </div>
                 <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Final Refund Amount:</span>
                    <span>₱{finalRefundAmount.toFixed(2)}</span>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleProcessRefund} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Refund
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

    