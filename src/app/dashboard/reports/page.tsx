
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
import { Calendar as CalendarIcon, Download, Loader2, DollarSign, RefreshCw, TrendingUp, TrendingDown, BookCopy, PlaneTakeoff, UserX, Ban, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

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
  rebookingHistory?: { fee: number }[];
  noShowFee?: number;
  cancellationFee?: number;
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
  const { user } = useUser();
  const isPlatformAdmin = user?.email === 'rielmagpantay@gmail.com';

  const [isGlobalView, setIsGlobalView] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore]);
  
  const boardingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'boarding');
  }, [firestore]);

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
      totalRebookingFees: 0,
      totalNoShowFees: 0,
      totalCancellationFees: 0,
      salesByFareType: {},
      bookingsByRoute: {},
    };
    if (!bookings || !boardingRecords || !dateRange?.from || !dateRange?.to) {
      return defaultData;
    }

    const transactions = bookings.filter(b => {
      const bookingDate = b.bookingDate?.toDate();
      const inDateRange = bookingDate && isWithinInterval(bookingDate, { start: dateRange.from!, end: dateRange.to! });
      if (!inDateRange) return false;
      
      // If not platform admin or global view off, filter by tenant logic is handled by security rules usually
      // but here we manually enforce it based on the current context if we want to support both views.
      // (Simplified: if not global view, filter current user's tenant if possible, 
      // but since we query the whole collection, we rely on the logic here)
      return true; 
    });

    let totalRebookingFees = 0;
    let totalNoShowFees = 0;
    let totalCancellationFees = 0;
    const salesByFareType: { [key: string]: number } = {};
    const bookingsByRoute: { [key: string]: number } = {};

    transactions.forEach(t => {
        if (t.routeName) {
            bookingsByRoute[t.routeName] = (bookingsByRoute[t.routeName] || 0) + 1;
        }

        if (t.paymentStatus === 'Paid' || t.paymentStatus === 'Refunded') {
            if (t.rebookingHistory) {
                totalRebookingFees += t.rebookingHistory.reduce((acc, item) => acc + item.fee, 0);
            }
            if (t.noShowFee) {
                totalNoShowFees += t.noShowFee;
            }
            if(t.paymentStatus === 'Paid' && t.fareDetails) {
                 t.fareDetails.forEach(detail => {
                    salesByFareType[detail.passengerType] = (salesByFareType[detail.passengerType] || 0) + detail.pricePerTicket;
                });
            }
        }
        if (t.paymentStatus === 'Refunded' && t.cancellationFee) {
            totalCancellationFees += t.cancellationFee;
        }
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
      totalRebookingFees,
      totalNoShowFees,
      totalCancellationFees,
      salesByFareType,
      bookingsByRoute,
    };
  }, [bookings, boardingRecords, dateRange]);
  
    const revenueData = useMemo(() => {
        if (!bookings) return [];

        const currentYear = new Date().getFullYear();
        const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(currentYear, i), 'MMM'),
            total: 0,
        }));

        bookings.forEach(booking => {
            if (booking.paymentStatus === 'Paid') {
                const bookingDate = booking.bookingDate.toDate();
                if (bookingDate.getFullYear() === currentYear) {
                    const month = bookingDate.getMonth();
                    monthlyRevenue[month].total += booking.totalPrice;
                }
            }
        });
        return monthlyRevenue;
    }, [bookings]);
    
    const { bookingsByRouteData, bookingsByRouteConfig } = useMemo(() => {
        if (!filteredData.bookingsByRoute) return { bookingsByRouteData: [], bookingsByRouteConfig: {} };

        const data = Object.entries(filteredData.bookingsByRoute)
            .map(([name, value], index) => ({
                name,
                value,
                fill: chartColors[index % chartColors.length],
            }))
            .sort((a, b) => b.value - a.value);
        
        const config = data.reduce((acc, cur) => {
            acc[cur.name] = { label: cur.name, color: cur.fill };
            return acc;
        }, {} as ChartConfig);

        return { bookingsByRouteData: data, bookingsByRouteConfig: config };
    }, [filteredData.bookingsByRoute]);
    
    const { salesByFareTypeData, salesByFareTypeConfig } = useMemo(() => {
        if (!filteredData.salesByFareType) return { salesByFareTypeData: [], salesByFareTypeConfig: {} };

        const data = Object.entries(filteredData.salesByFareType)
            .map(([name, value], index) => ({
                name,
                value,
                fill: chartColors[index % chartColors.length],
            }))
            .sort((a, b) => b.value - a.value);
        
        const config = data.reduce((acc, cur) => {
            acc[cur.name] = { label: cur.name, color: cur.fill };
            return acc;
        }, {} as ChartConfig);

        return { salesByFareTypeData: data, salesByFareTypeConfig: config };
    }, [filteredData.salesByFareType]);


  const revenueChartConfig: ChartConfig = { total: { label: "Revenue" } };

  const exportToCSV = () => {
    const headers = ['Booking Ref', 'Booking Date', 'Passenger', 'Route', 'Total Price', 'Payment Status', 'Rebooking Fees', 'No-Show Fee', 'Cancellation Fee', 'Refund Amount'];
    const rows = filteredData.transactions.map(t => [
      t.id,
      format(t.bookingDate.toDate(), 'yyyy-MM-dd HH:mm'),
      t.passengerInfo?.[0]?.fullName || t.passengerEmail,
      t.routeName,
      t.totalPrice.toFixed(2),
      t.paymentStatus,
      (t.rebookingHistory?.reduce((acc, item) => acc + item.fee, 0) || 0).toFixed(2),
      (t.noShowFee || 0).toFixed(2),
      (t.cancellationFee || 0).toFixed(2),
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

  const isLoading = isLoadingBookings || isLoadingBoarding;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales &amp; Accounting Report</h1>
            <p className="text-muted-foreground">
              {isGlobalView ? 'Showing aggregated system-wide financial data' : 'Generate reports for financial and booking analysis.'}
            </p>
        </div>
        <div className="flex items-center gap-4">
            {isPlatformAdmin && (
              <div className="flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                <Globe className="h-4 w-4 text-primary" />
                <Label htmlFor="global-reports" className="text-sm font-bold text-primary">Global View</Label>
                <Switch 
                  id="global-reports" 
                  checked={isGlobalView} 
                  onCheckedChange={setIsGlobalView} 
                />
              </div>
            )}
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
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <BookCopy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredData.totalBookings}</div>
                    <p className="text-xs text-muted-foreground">Total bookings made in the period.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rebooking Fees</CardTitle>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₱{filteredData.totalRebookingFees.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Fees from changed bookings.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">No-Show Fees</CardTitle>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₱{filteredData.totalNoShowFees.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Fees from passengers who did not board.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancellation Fees</CardTitle>
                    <Ban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₱{filteredData.totalCancellationFees.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Revenue retained from refunds.</p>
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
        </div>

        <div className="grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Annual Revenue Overview</CardTitle>
                    <CardDescription>Monthly revenue totals for the current year from all paid bookings.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={revenueData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${value/1000}k`} />
                            <Tooltip cursor={{fill: 'hsl(var(--secondary))'}} content={<ChartTooltipContent formatter={(value) => `₱${(value as number).toLocaleString()}`} />} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Bookings by Route</CardTitle>
                    <CardDescription>A breakdown of all passenger bookings across different routes for the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    {bookingsByRouteData.length > 0 ? (
                        <ChartContainer config={bookingsByRouteConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                    <Pie data={bookingsByRouteData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} >
                                    {bookingsByRouteData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartLegend content={<ChartLegendContent nameKey="name" />} className="pt-4" />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                            No booking data available.
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Sales by Fare Type</CardTitle>
                    <CardDescription>Revenue from paid bookings by fare type for the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    {salesByFareTypeData.length > 0 ? (
                        <ChartContainer config={salesByFareTypeConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => `₱${(value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} hideLabel />} />
                                    <Pie data={salesByFareTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} >
                                    {salesByFareTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartLegend content={<ChartLegendContent nameKey="name" />} className="pt-4" />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                            No sales data for fare types in this period.
                        </div>
                    )}
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
                <TableHead>Total Price</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Rebooking Fees</TableHead>
                <TableHead>No-Show Fee</TableHead>
                <TableHead>Cancellation Fee</TableHead>
                <TableHead>Refund</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
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
                    <TableCell>
                      ₱{(transaction.rebookingHistory?.reduce((acc, item) => acc + item.fee, 0) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₱{(transaction.noShowFee || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₱{(transaction.cancellationFee || 0).toFixed(2)}
                    </TableCell>
                     <TableCell className="text-destructive">
                        {transaction.refundAmount ? `₱${transaction.refundAmount.toFixed(2)}` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
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
