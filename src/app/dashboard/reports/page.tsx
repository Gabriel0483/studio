
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Loader2, DollarSign, RefreshCw, TrendingUp, TrendingDown, BookCopy, PlaneTakeoff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Booking {
  firestoreId: string;
  id: string;
  passengerEmail: string;
  passengerInfo?: { fullName: string, fareType: string, id: string }[];
  fareDetails?: { passengerType: string, pricePerTicket: number }[];
  routeName: string;
  travelDate: Timestamp;
  bookingDate: Timestamp;
  totalPrice: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Refunded';
  refundAmount?: number;
}

interface BoardingRecord {
    id: string;
    bookingId: string; // firestoreId of the booking
    passengerId: string; // unique passenger ID from booking
    scheduleId: string;
    boardingTime: Timestamp;
}

export default function ReportsPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const bookingsQuery = useMemoFirebase(() => {
    if (isUserLoading || !firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore, isUserLoading]);
  
  const boardingQuery = useMemoFirebase(() => {
    if (isUserLoading || !firestore) return null;
    return collection(firestore, 'boarding');
  }, [firestore, isUserLoading]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery, { idField: 'firestoreId' });
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection<BoardingRecord>(boardingQuery);


  const filteredData = useMemo(() => {
    const defaultData = {
      transactions: [],
      grossRevenue: 0,
      totalRefunds: 0,
      netRevenue: 0,
      earnedRevenue: 0,
      totalBookings: 0,
    };
    if (!bookings || !boardingRecords || !dateRange?.from || !dateRange?.to) {
      return defaultData;
    }

    const transactions = bookings.filter(b => {
      const bookingDate = b.bookingDate?.toDate();
      return bookingDate && isWithinInterval(bookingDate, { start: dateRange.from!, end: dateRange.to! });
    });

    const grossRevenue = transactions
      .filter(t => t.paymentStatus === 'Paid' || t.paymentStatus === 'Refunded')
      .reduce((acc, t) => acc + t.totalPrice, 0);
      
    const totalRefunds = transactions
      .filter(t => t.paymentStatus === 'Refunded')
      .reduce((acc, t) => acc + (t.refundAmount || 0), 0);

    const netRevenue = grossRevenue - totalRefunds;

    const earnedRevenue = boardingRecords.reduce((acc, board) => {
        const boardingTime = board.boardingTime?.toDate();
        if (!boardingTime || !isWithinInterval(boardingTime, { start: dateRange.from!, end: dateRange.to! })) {
            return acc;
        }

        const booking = bookings.find(b => b.firestoreId === board.bookingId);
        if (!booking || booking.paymentStatus !== 'Paid') {
            return acc;
        }

        const passengerInfo = booking.passengerInfo?.find(p => `${booking.firestoreId}-${p.id}` === board.passengerId);
        if (!passengerInfo) {
            // Fallback for older data that might not have the new passenger unique ID format
            const passengerIndex = parseInt(board.passengerId.split('-').pop() || '0', 10);
            const legacyPassenger = booking.passengerInfo?.[passengerIndex];
            if (legacyPassenger) {
                 const fareDetail = booking.fareDetails?.find(f => f.passengerType === legacyPassenger.fareType);
                 return acc + (fareDetail?.pricePerTicket || 0);
            }
            return acc;
        }

        const fareDetail = booking.fareDetails?.find(f => f.passengerType === passengerInfo.fareType);
        return acc + (fareDetail?.pricePerTicket || 0);

    }, 0);

    return {
      transactions: transactions.sort((a,b) => b.bookingDate.toMillis() - a.bookingDate.toMillis()),
      grossRevenue,
      totalRefunds,
      netRevenue,
      earnedRevenue,
      totalBookings: transactions.length,
    };
  }, [bookings, boardingRecords, dateRange]);

  const exportToCSV = () => {
    const headers = ['Booking Ref', 'Booking Date', 'Passenger', 'Route', 'Total Price', 'Payment Status', 'Refund Amount'];
    const rows = filteredData.transactions.map(t => [
      t.id,
      format(t.bookingDate.toDate(), 'yyyy-MM-dd HH:mm'),
      t.passengerInfo?.[0]?.fullName || t.passengerEmail,
      t.routeName,
      t.totalPrice.toFixed(2),
      t.paymentStatus,
      t.refundAmount?.toFixed(2) || '0.00'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_to_${format(dateRange?.to || new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatDate = (timestamp: Timestamp | undefined, dateFormat = 'PPP') => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), dateFormat);
  };
  
  const getPaymentStatusVariant = (status: Booking['paymentStatus']) => {
    switch (status) {
        case 'Paid':
            return 'default';
        case 'Unpaid':
            return 'secondary';
        case 'Refunded':
             return 'destructive';
        default:
            return 'outline';
    }
  };

  const isLoading = isLoadingBookings || isLoadingBoarding || isUserLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales & Accounting Report</h1>
            <p className="text-muted-foreground">Generate reports for financial and booking analysis.</p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                        <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(dateRange.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
            <Button onClick={exportToCSV} disabled={isLoading || filteredData.transactions.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </div>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₱{filteredData.grossRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Total revenue from paid bookings in period.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Earned Revenue</CardTitle>
                    <PlaneTakeoff className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₱{filteredData.earnedRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Revenue from passengers who boarded in period.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">- ₱{filteredData.totalRefunds.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Total amount refunded in period.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₱{filteredData.netRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Gross revenue minus refunds.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <BookCopy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredData.totalBookings}</div>
                    <p className="text-xs text-muted-foreground">Total bookings made in the period.</p>
                </CardContent>
            </Card>
        </div>


      <Card>
        <CardHeader>
          <CardTitle>Detailed Transactions</CardTitle>
          <CardDescription>
            A detailed list of all booking transactions within the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Ref</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Refunded Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filteredData.transactions.length > 0 ? (
                filteredData.transactions.map((transaction) => (
                  <TableRow key={transaction.firestoreId}>
                    <TableCell className="font-mono">{transaction.id}</TableCell>
                    <TableCell>{formatDate(transaction.bookingDate)}</TableCell>
                    <TableCell className="font-medium">{transaction.passengerInfo?.[0]?.fullName || transaction.passengerEmail}</TableCell>
                    <TableCell>{transaction.routeName}</TableCell>
                    <TableCell>₱{transaction.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(transaction.paymentStatus)}>{transaction.paymentStatus}</Badge>
                    </TableCell>
                     <TableCell className="text-destructive">
                        {transaction.refundAmount ? `₱${transaction.refundAmount.toFixed(2)}` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No transactions found for the selected date range.
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
