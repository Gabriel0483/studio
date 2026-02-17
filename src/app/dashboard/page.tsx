
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, Timestamp, query, where } from 'firebase/firestore';
import { format, getMonth, getYear } from 'date-fns';
import { DollarSign, Users, Ticket, CheckCircle, Clock, CreditCard, XCircle, ClipboardCheck, Ban, Check, Bot, Ship, BarChart as BarChartIcon, UserX, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/components/dashboard/tenant-context';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { tenantId, tenantName } = useTenant();
  const [date, setDate] = useState<Date>();
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [isGlobalView, setIsGlobalView] = useState(false);

  const isPlatformAdmin = user?.email === 'rielmagpantay@gmail.com';

  useEffect(() => {
    setDate(new Date());
  }, []);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    if (isPlatformAdmin && isGlobalView) return collection(firestore, 'bookings');
    return query(collection(firestore, 'bookings'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId, isPlatformAdmin, isGlobalView]);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    if (isPlatformAdmin && isGlobalView) return collection(firestore, 'schedules');
    return query(collection(firestore, 'schedules'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId, isPlatformAdmin, isGlobalView]);

  const boardingQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, 'boarding');
  }, [firestore, tenantId]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(boardingQuery);
  
  const dailySchedules = useMemo(() => {
    if (!allSchedules || !date) return [];
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
        paid: 0, unpaid: 0, boarded: 0, paidPassengers: 0,
        tripsBoarding: 0, noShows: 0,
    };

    if (!bookings || !allSchedules || !boardingRecords || !date) {
      return defaultStats;
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd');

    const relevantBookings = bookings.filter(b => {
      const travelDate = b.travelDate instanceof Timestamp ? b.travelDate.toDate() : new Date(b.travelDate);
      if (format(travelDate, 'yyyy-MM-dd') !== selectedDateStr) {
          return false;
      }
      if (scheduleFilter !== 'all') {
          const bookingSchedule = allSchedules.find(s => s.id === b.scheduleId);
          if (!bookingSchedule) return false;
          return bookingSchedule.id === scheduleFilter || bookingSchedule.sourceScheduleId === scheduleFilter;
      }
      return true;
    });
    
    const paidReservedBookings = relevantBookings.filter(b => b.paymentStatus === 'Paid' && (b.status === 'Reserved' || b.status === 'Confirmed'));
    const paidPassengers = paidReservedBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);

    const relevantBoardingRecords = (boardingRecords || []).filter(br => {
        const schedule = allSchedules.find(s => s.id === br.scheduleId);
        if (!schedule || !schedule.date || schedule.date !== selectedDateStr) {
          return false;
        }

        if (scheduleFilter !== 'all') {
            return schedule.id === scheduleFilter || schedule.sourceScheduleId === scheduleFilter;
        }
        return true;
    });

    const boarded = relevantBoardingRecords.filter(br => br.status === 'Boarded').length;
    const noShows = relevantBoardingRecords.filter(br => br.status === 'No-show').length;

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
    
    const tripsBoarding = allSchedules.filter(s => {
        const scheduleDate = s.date ? new Date(s.date) : date;
        return format(scheduleDate, 'yyyy-MM-dd') === selectedDateStr && s.boardingStatus === 'Boarding';
    }).length;

    return {
      totalRevenue,
      totalPassengers,
      ...statusCounts,
      paid,
      unpaid,
      boarded,
      noShows,
      paidPassengers: paidPassengers,
      tripsBoarding,
    };
  }, [date, scheduleFilter, bookings, allSchedules, boardingRecords]);

  const { revenueData, bookingsByRouteData } = useMemo(() => {
    if (!bookings) return { revenueData: [], bookingsByRouteData: [] };

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

  const isLoading = isLoadingBookings || isLoadingSchedules || isLoadingBoarding || !date;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            {isGlobalView ? 'Aggregated system-wide data' : `Real-time operations for ${tenantName}`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
            {isPlatformAdmin && (
              <div className="flex items-center space-x-2 bg-primary/10 px-3 py-2 rounded-lg border border-primary/20">
                <Globe className="h-4 w-4 text-primary" />
                <Label htmlFor="global-view" className="text-xs font-bold text-primary">Global View</Label>
                <Switch 
                  id="global-view" 
                  checked={isGlobalView} 
                  onCheckedChange={setIsGlobalView} 
                />
              </div>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/o/${tenantId}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Portal
              </Link>
            </Button>
            <Input
              type="date"
              value={date ? format(date, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  setDate(new Date(year, month - 1, day));
                }
              }}
              className="w-full sm:w-[160px] h-9"
            />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[256px] items-center justify-center rounded-lg border border-dashed">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading daily figures...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">₱{filteredStats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Paid bookings for the selected date.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passengers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{filteredStats.totalPassengers}</div>
                <p className="text-xs text-muted-foreground">Total traveling today.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Waitlisted</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.waitlisted}</div>
                    <p className="text-xs text-muted-foreground">Passengers awaiting a seat.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Boarded</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.boarded} / {filteredStats.paidPassengers}</div>
                    <p className="text-xs text-muted-foreground">Confirmed passengers on board.</p>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly totals for the current year.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={{ total: { label: "Revenue" } }} className="h-full w-full">
              <ResponsiveContainer>
                <BarChart data={revenueData}>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₱${value/1000}k`} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Routes</CardTitle>
            <CardDescription>Popularity based on total bookings.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {bookingsByRouteData.length > 0 ? (
                <ChartContainer config={{}} className="h-full w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={bookingsByRouteData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} >
                            {bookingsByRouteData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltipContent />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
             ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground italic">No booking data found.</div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
