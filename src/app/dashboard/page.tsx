
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { format, getMonth, getYear } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Users, Ticket, CheckCircle, Clock, CreditCard, XCircle, ClipboardCheck, Ban, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const firestore = useFirestore();
  const [date, setDate] = useState<Date>(new Date());
  const [scheduleFilter, setScheduleFilter] = useState('all');

  const bookingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);
  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const boardingQuery = useMemoFirebase(() => firestore ? collection(firestore, 'boarding') : null, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(boardingQuery);
  
  const dailySchedules = useMemo(() => {
    if (!allSchedules) return [];
    const selectedDateStr = format(date, 'yyyy-MM-dd');
    return allSchedules.filter(s => {
        return s.tripType === 'Daily' || (s.tripType === 'Special' && s.date === selectedDateStr);
    }).sort((a,b) => a.departureTime.localeCompare(b.departureTime));
  }, [date, allSchedules]);

  useEffect(() => {
      setScheduleFilter('all');
  }, [date]);

  const filteredStats = useMemo(() => {
    const defaultStats = {
        totalRevenue: 0, totalPassengers: 0,
        reserved: 0, confirmed: 0, waitlisted: 0, refunded: 0,
        paid: 0, unpaid: 0, boarded: 0, paidPassengers: 0
    };

    if (!bookings || !allSchedules) {
      return defaultStats;
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd');

    const relevantBookings = bookings.filter(b => {
      const travelDate = b.travelDate instanceof Timestamp ? b.travelDate.toDate() : new Date(b.travelDate);
      if (format(travelDate, 'yyyy-MM-dd') !== selectedDateStr) {
          return false;
      }
      if (scheduleFilter !== 'all' && b.scheduleId !== scheduleFilter) {
          return false;
      }
      return true;
    });
    
    const paidReservedBookings = relevantBookings.filter(b => b.paymentStatus === 'Paid' && (b.status === 'Reserved' || b.status === 'Confirmed'));
    const paidPassengers = paidReservedBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);

    const relevantBoardingRecords = (boardingRecords || []).filter(br => {
        const schedule = allSchedules.find(s => s.id === br.scheduleId);
        if (!schedule) return false;

        const scheduleDate = schedule.tripType === 'Daily' ? date : (schedule.date ? new Date(schedule.date) : new Date());
        if (format(scheduleDate, 'yyyy-MM-dd') !== selectedDateStr) {
          return false;
        }
        if (scheduleFilter !== 'all') {
            return br.scheduleId === scheduleFilter;
        }
        return true;
    });


    const totalRevenue = relevantBookings
      .filter(b => b.paymentStatus === 'Paid')
      .reduce((acc, b) => acc + b.totalPrice, 0);

    const totalPassengers = relevantBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);
    
    const statusCounts = relevantBookings.reduce((acc, b) => {
        const status = b.status || 'Reserved';
        if (status === 'Cancelled' || status === 'Refunded') {
            acc.refunded = (acc.refunded || 0) + 1;
        } else if (status === 'Confirmed') {
            acc.confirmed = (acc.confirmed || 0) + 1;
        } else if (status === 'Reserved') {
            acc.reserved = (acc.reserved || 0) + 1;
        } else if (status === 'Waitlisted') {
            acc.waitlisted = (acc.waitlisted || 0) + 1;
        }
        return acc;
    }, { reserved: 0, confirmed: 0, waitlisted: 0, refunded: 0 });

    const paid = relevantBookings.filter(b => b.paymentStatus === 'Paid').length;
    const unpaid = relevantBookings.filter(b => b.paymentStatus !== 'Paid').length;
    
    return {
      totalRevenue,
      totalPassengers,
      ...statusCounts,
      paid,
      unpaid,
      boarded: relevantBoardingRecords.length,
      paidPassengers: paidPassengers,
    };
  }, [date, scheduleFilter, bookings, allSchedules, boardingRecords]);

  const { revenueData, bookingsByRouteData } = useMemo(() => {
    if (!bookings) return { revenueData: [], bookingsByRouteData: [] };

    // Process revenue data
    const currentYear = getYear(new Date());
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(currentYear, i), 'MMM'),
      total: 0,
    }));

    bookings.forEach(booking => {
      if (booking.paymentStatus === 'Paid') {
        const bookingDate = booking.bookingDate instanceof Timestamp ? booking.bookingDate.toDate() : new Date(booking.bookingDate);
        if (getYear(bookingDate) === currentYear) {
          const month = getMonth(bookingDate);
          monthlyRevenue[month].total += booking.totalPrice;
        }
      }
    });
    
    // Process bookings by route
    const routeCounts: { [key: string]: number } = {};
    bookings.forEach(booking => {
      if (booking.routeName) {
        routeCounts[booking.routeName] = (routeCounts[booking.routeName] || 0) + 1;
      }
    });

    const bookingsByRouteData = Object.entries(routeCounts)
        .map(([name, value], index) => ({
            name,
            value,
            fill: chartColors[index % chartColors.length],
        }))
        .sort((a, b) => b.value - a.value);


    return { revenueData: monthlyRevenue, bookingsByRouteData };
  }, [bookings]);

  const revenueChartConfig: ChartConfig = {
      total: { label: "Revenue" },
  };

  const bookingsChartConfig = bookingsByRouteData.reduce((acc, cur) => {
    acc[cur.name] = {
      label: cur.name,
      color: cur.fill,
    };
    return acc;
  }, {} as ChartConfig);
  
  const overviewCards = [
      { title: 'Total Revenue', value: `₱${filteredStats.totalRevenue.toFixed(2)}`, description: 'Revenue from paid bookings.', icon: DollarSign },
      { title: 'Total Passengers', value: filteredStats.totalPassengers.toString(), description: 'Passengers for selected scope.', icon: Users },
  ];

  const isLoading = isLoadingBookings || isLoadingSchedules || isLoadingBoarding;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Here's a real-time look at your operations for the selected date.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Popover>
            <PopoverTrigger asChild>
                <Button
                variant={"outline"}
                className={cn(
                    "w-full sm:w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => setDate(newDate || new Date())}
                initialFocus
                />
            </PopoverContent>
            </Popover>

             <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Filter by trip..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Day</SelectItem>
                    {dailySchedules.map(schedule => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                            {schedule.departureTime} - {schedule.arrivalTime}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[256px] items-center justify-center rounded-lg border border-dashed">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading daily figures...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((card) => (
            <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
            </Card>
            ))}

            <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Booking Status</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.reserved + filteredStats.waitlisted + filteredStats.confirmed + filteredStats.refunded} Total Bookings</div>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-sky-500"/>
                            <span>Reserved: {filteredStats.reserved}</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <CheckCircle className="h-3 w-3 text-green-500"/>
                            <span>Confirmed: {filteredStats.confirmed}</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <Clock className="h-3 w-3 text-orange-500"/>
                            <span>Waitlisted: {filteredStats.waitlisted}</span>
                        </div>
                         <div className="flex items-center gap-1">
                             <Ban className="h-3 w-3 text-red-500"/>
                            <span>Refunded/Cancelled: {filteredStats.refunded}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.paid + filteredStats.unpaid} Total</div>
                     <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500"/>
                            <span>Paid: {filteredStats.paid}</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <XCircle className="h-3 w-3 text-red-500"/>
                            <span>Unpaid: {filteredStats.unpaid}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2 lg:col-span-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Boarding Progress</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {filteredStats.boarded} / {filteredStats.paidPassengers}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {filteredStats.boarded} of {filteredStats.paidPassengers} confirmed passengers have boarded for the selected scope.
                    </p>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Monthly revenue totals for the current year from paid bookings.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={revenueData}>
                    <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₱${value/1000}k`}
                    />
                    <Tooltip
                        cursor={{fill: 'hsl(var(--secondary))'}}
                        content={<ChartTooltipContent formatter={(value) => `₱${(value as number).toLocaleString()}`} />}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Bookings by Route</CardTitle>
            <CardDescription>A breakdown of all passenger bookings across different routes.</CardDescription>
          </CardHeader>
          <CardContent>
             {bookingsByRouteData.length > 0 ? (
                <ChartContainer config={bookingsChartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                            <Pie data={bookingsByRouteData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} >
                            {bookingsByRouteData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
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
      </div>
    </div>
  );
}

    