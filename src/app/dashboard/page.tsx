'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { revenueData, bookingsData } from "@/lib/data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Users, Ticket, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';


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

  const bookingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);
  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  
  const dailyStats = useMemo(() => {
    if (!bookings || !schedules) {
      return { totalRevenue: 0, totalBookings: 0, totalPassengers: 0, occupancy: 0 };
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd');

    const dailySchedules = schedules.filter(s => {
        return s.tripType === 'Daily' || (s.tripType === 'Special' && s.date === selectedDateStr);
    });

    const dailyScheduleIds = dailySchedules.map(s => s.id);
    
    const dailyBookings = bookings.filter(b => {
      const travelDate = b.travelDate instanceof Timestamp ? b.travelDate.toDate() : new Date(b.travelDate);
      return format(travelDate, 'yyyy-MM-dd') === selectedDateStr;
    });

    const totalRevenue = dailyBookings
      .filter(b => b.paymentStatus === 'Paid')
      .reduce((acc, b) => acc + b.totalPrice, 0);

    const totalBookings = dailyBookings.length;

    const totalPassengers = dailyBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);

    const totalCapacity = dailySchedules.reduce((acc, s) => acc + (s.availableSeats + (
        bookings.filter(b => b.scheduleId === s.id && b.status === 'Reserved').reduce((sum, b) => sum + b.numberOfSeats, 0)
    )), 0);
    
    const totalSeatsBooked = dailyBookings
        .filter(b => b.status === 'Reserved')
        .reduce((acc, b) => acc + b.numberOfSeats, 0);

    const occupancy = totalCapacity > 0 ? (totalSeatsBooked / totalCapacity) * 100 : 0;
    
    return {
      totalRevenue,
      totalBookings,
      totalPassengers,
      occupancy,
    };
  }, [date, bookings, schedules]);
  
  const overviewCards = [
      { title: 'Total Revenue', value: `₱${dailyStats.totalRevenue.toFixed(2)}`, description: 'Total revenue from paid bookings.', icon: DollarSign },
      { title: 'Total Bookings', value: dailyStats.totalBookings.toString(), description: 'Total number of bookings made.', icon: Ticket },
      { title: 'Total Passengers', value: dailyStats.totalPassengers.toString(), description: 'Total passengers for all bookings.', icon: Users },
      { title: 'Seat Occupancy', value: `${dailyStats.occupancy.toFixed(1)}%`, description: 'Percentage of seats sold vs. available.', icon: Percent },
  ];

  const isLoading = isLoadingBookings || isLoadingSchedules;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Here's a real-time look at your operations for the selected date.</p>
        </div>
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
