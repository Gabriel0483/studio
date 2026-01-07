'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertCircle, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { collection, doc, query, where, getDocs, updateDoc, Timestamp, or } from "firebase/firestore";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

export default function RebookingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedBooking, setSearchedBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

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
      const q = query(bookingsRef, or(
          where('id', '==', searchQuery.toUpperCase()),
          where('passengerInfo.0.fullName', '==', searchQuery)
      ));
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const bookingDoc = querySnapshot.docs[0];
        setSearchedBooking({ ...bookingDoc.data(), firestoreId: bookingDoc.id });
      } else {
        setSearchedBooking(null);
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
    const bookingRef = doc(firestore, 'bookings', searchedBooking.firestoreId);
    try {
      await updateDoc(bookingRef, { refundStatus: 'Refunded' });
      // Refresh booking state
      setSearchedBooking({ ...searchedBooking, refundStatus: 'Refunded' });
      toast({
        title: "Refund Processed",
        description: `Refund for booking #${searchedBooking.id} has been marked as processed.`,
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
  
  const isRefundable = searchedBooking?.status === 'Cancelled' && searchedBooking?.paymentStatus === 'Paid' && searchedBooking?.refundStatus !== 'Refunded';

  return (
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
                            <p><Badge variant={searchedBooking.status === 'Cancelled' ? 'destructive' : 'default'}>{searchedBooking.status}</Badge></p>
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground">Payment Status</p>
                            <p><Badge variant={searchedBooking.paymentStatus === 'Paid' ? 'default' : 'secondary'}>{searchedBooking.paymentStatus}</Badge></p>
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground">Refund Status</p>
                            <p><Badge variant={searchedBooking.refundStatus === 'Refunded' ? 'default' : 'secondary'}>{searchedBooking.refundStatus}</Badge></p>
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
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2 justify-end bg-muted/50 py-4">
                <Button variant="secondary" onClick={handleProcessRefund} disabled={!isRefundable}>
                    Process Refund
                </Button>
                <Button onClick={handleRebook}>
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
  );
}
