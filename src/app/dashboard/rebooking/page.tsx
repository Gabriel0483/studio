'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RebookingPage() {
  
  // Dummy data - replace with actual data fetching
  const refundableBookings = [
    { id: 'BK1234', passenger: 'John Doe', amount: 150.00, status: 'Cancelled', payment: 'Paid' },
  ];

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
              {refundableBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono">{booking.id}</TableCell>
                  <TableCell>{booking.passenger}</TableCell>
                  <TableCell>₱{booking.amount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant="destructive">{booking.status}</Badge></TableCell>
                  <TableCell><Badge>{booking.payment}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm">Process Refund</Button>
                  </TableCell>
                </TableRow>
              ))}
               <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">No bookings are currently eligible for a refund.</p>
                  </TableCell>
              </TableRow>
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
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="Enter Booking Reference..." />
            <Button type="submit">
                <Search className="mr-2 h-4 w-4" /> 
                Find Booking
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
