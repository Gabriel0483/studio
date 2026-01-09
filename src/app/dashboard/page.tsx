'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { revenueData, bookingsData } from "@/lib/data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Users, Ticket, Percent, CheckCircle, Clock, CreditCard, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const chartConfig: ChartConfig = {
  total: {
    label: "Revenue",
  },
};

const bookingsChartConfig = {
  value: {
    label: "Bookings",
  },
  ...bookingsData.reduce((acc, cur) => {
    acc[cur.name] = {
      label: cur.name,
      color: cur.fill,
    };
    return acc;
  }, {} as ChartConfig),
} satisfies ChartConfig;


export default function DashboardPage() {
  const firestore = useFirestore();
  const [date, setDate] = useState<Date>(new Date());
  const [scheduleFilter, setScheduleFilter] = useState('all');

  const bookingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);
  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  
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
    if (!bookings || !allSchedules) {
      return { totalRevenue: 0, totalPassengers: 0, reserved: 0, waitlisted: 0, paid: 0, unpaid: 0 };
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

    const totalRevenue = relevantBookings
      .filter(b => b.paymentStatus === 'Paid')
      .reduce((acc, b) => acc + b.totalPrice, 0);

    const totalPassengers = relevantBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);

    const reserved = relevantBookings.filter(b => b.status === 'Reserved').length;
    const waitlisted = relevantBookings.filter(b => b.status === 'Waitlisted').length;
    
    const paid = relevantBookings.filter(b => b.paymentStatus === 'Paid').length;
    const unpaid = relevantBookings.filter(b => b.paymentStatus !== 'Paid').length;
    
    return {
      totalRevenue,
      totalPassengers,
      reserved,
      waitlisted,
      paid,
      unpaid,
    };
  }, [date, scheduleFilter, bookings, allSchedules]);
  
  const overviewCards = [
      { title: 'Total Revenue', value: `₱${filteredStats.totalRevenue.toFixed(2)}`, description: 'Revenue from paid bookings.', icon: DollarSign },
      { title: 'Total Passengers', value: filteredStats.totalPassengers.toString(), description: 'Passengers for selected scope.', icon: Users },
  ];

  const isLoading = isLoadingBookings || isLoadingSchedules;

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
        <div className="flex h-[128px] items-center justify-center rounded-lg border border-dashed">
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Booking Status</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.reserved + filteredStats.waitlisted} Total</div>
                     <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500"/>
                            <span>Reserved: {filteredStats.reserved}</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <Clock className="h-3 w-3 text-orange-500"/>
                            <span>Waitlisted: {filteredStats.waitlisted}</span>
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
        </div>
      )}


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Monthly revenue totals for the current year.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
            <CardDescription>A breakdown of passenger bookings across different routes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bookingsChartConfig} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie data={bookingsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} >
                           {bookingsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
