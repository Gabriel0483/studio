'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, getDocs, updateDoc } from "firebase/firestore";
import React, { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function RebookingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [bookingRef, setBookingRef] = useState('');

  const refundableBookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "bookings"),
      where("status", "==", "Cancelled"),
      where("paymentStatus", "==", "Paid"),
      where("refundStatus", "!=", "Refunded")
    );
  }, [firestore]);

  const { data: allRefundableBookings, isLoading } = useCollection(refundableBookingsQuery, { idField: 'firestoreId' });

  const filteredBookings = useMemo(() => {
    if (!allRefundableBookings) return [];
    if (!search) return allRefundableBookings;
    const searchTerm = search.toLowerCase();
    return allRefundableBookings.filter(booking => 
      booking.id.toLowerCase().includes(searchTerm) ||
      (booking.passengerInfo && booking.passengerInfo[0].fullName.toLowerCase().includes(searchTerm))
    );
  }, [allRefundableBookings, search]);
  
  const handleProcessRefund = async (booking: any) => {
    if (!firestore) return;
    const bookingRef = doc(firestore, 'bookings', booking.firestoreId);
    try {
        await updateDoc(bookingRef, { refundStatus: 'Refunded' });
        toast({
            title: "Refund Processed",
            description: `Refund for booking #${booking.id} has been marked as processed.`,
        });
    } catch (error) {
        console.error("Error processing refund: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process refund.",
        });
    }
  };
  
  const handleFindBooking = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!bookingRef) {
        toast({
            variant: "destructive",
            title: "Missing Reference",
            description: "Please enter a booking reference number.",
        });
        return;
      }
      router.push(`/dashboard/bookings/${bookingRef}/edit`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rebooking & Refunds</h1>
        <p className="text-muted-foreground">Manage booking changes and process passenger refunds.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refund Processing</CardTitle>
          <CardDescription>
            View and process refunds for cancelled bookings that have been paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 pb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by booking ref, name..."
                  className="pl-10 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Ref</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Booking Status</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              ) : filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono">{booking.id}</TableCell>
                    <TableCell>{booking.passengerInfo ? booking.passengerInfo[0].fullName : 'N/A'}</TableCell>
                    <TableCell>₱{booking.totalPrice.toFixed(2)}</TableCell>
                    <TableCell><Badge variant="destructive">{booking.status}</Badge></TableCell>
                    <TableCell><Badge>{booking.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleProcessRefund(booking)}>Process Refund</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <p className="text-muted-foreground">No bookings are currently eligible for a refund.</p>
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Rebooking Management</CardTitle>
          <CardDescription>
            Search for an existing booking to modify and rebook onto a new schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFindBooking} className="flex w-full max-w-sm items-center space-x-2">
            <Input 
                type="text" 
                placeholder="Enter Booking Reference..." 
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
            />
            <Button type="submit">
                <Search className="mr-2 h-4 w-4" /> 
                Find Booking
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
