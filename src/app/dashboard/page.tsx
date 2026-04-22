'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, Timestamp, query, where, doc } from 'firebase/firestore';
import { format, getMonth, getYear, isValid } from 'date-fns';
import { DollarSign, Users, Clock, ClipboardCheck, Loader2, Ship, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  const [date, setDate] = useState<Date>();

  useEffect(() => {
    setDate(new Date());
  }, []);

  const staffDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'staff', user.uid) : null), [firestore, user]);
  const { data: staffData, isLoading: isLoadingStaff } = useDoc(staffDocRef);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isLoadingStaff) return null;
    
    const isPlatformAdmin = ['rielmagpantay@gmail.com', 'mariel.dumaoal@gmail.com'].includes(user.email || '');
    const roles = staffData?.roles || [];
    
    if (!staffData && !isPlatformAdmin) return null;

    const isFullAccess = roles.some(r => ['Super Admin', 'Operations Manager', 'Finance/Accounting'].includes(r)) || isPlatformAdmin;
    const baseCol = collection(firestore, 'bookings');
    
    if (isFullAccess) return baseCol;
    
    if (staffData?.assignedPortName) {
      return query(baseCol, where('departurePortName', '==', staffData.assignedPortName));
    }

    return null;
  }, [firestore, user, staffData, isLoadingStaff]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]));
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'boarding') : null, [firestore]));
  const { data: ships, isLoading: isLoadingShips } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'ships') : null, [firestore]));
  
  const stats = useMemo(() => {
    const defaultStats = {
        totalRevenue: 0, totalPassengers: 0, waitlisted: 0, boarded: 0, paidPassengers: 0,
        tripsToday: 0, delayedTrips: 0, fleetReadiness: 0, activeVessels: 0
    };

    if (!bookings || !allSchedules || !boardingRecords || !date || !isValid(date) || !ships) {
      return defaultStats;
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd');

    // 1. Booking Metrics
    const relevantBookings = bookings.filter(b => {
      const travelDate = b.travelDate instanceof Timestamp ? b.travelDate.toDate() : new Date(b.travelDate);
      return isValid(travelDate) && format(travelDate, 'yyyy-MM-dd') === selectedDateStr;
    });
    
    const paidReservedBookings = relevantBookings.filter(b => b.paymentStatus === 'Paid' && (b.status === 'Reserved' || b.status === 'Confirmed' || b.status === 'Completed'));
    const paidPassengers = paidReservedBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);

    // 2. Boarding Metrics
    const relevantBoardingRecords = (boardingRecords || []).filter(br => {
        const schedule = allSchedules.find(s => s.id === br.scheduleId);
        return schedule && (schedule.date === selectedDateStr || (schedule.tripType === 'Daily'));
    });
    const boarded = relevantBoardingRecords.filter(br => br.status === 'Boarded').length;

    // 3. Trip Status Metrics
    const todayTrips = allSchedules.filter(s => {
        const isToday = s.date === selectedDateStr;
        const isDaily = s.tripType === 'Daily';
        // If staff is restricted, only count their port's trips
        if (staffData?.assignedPortName && s.departurePortName !== staffData.assignedPortName) return false;
        return isToday || isDaily;
    });

    // 4. Fleet Readiness
    const inServiceCount = ships.filter(s => s.status === 'In Service').length;
    const readiness = ships.length > 0 ? (inServiceCount / ships.length) * 100 : 0;

    return {
      totalRevenue: relevantBookings.filter(b => b.paymentStatus === 'Paid').reduce((acc, b) => acc + b.totalPrice, 0),
      totalPassengers: relevantBookings.reduce((acc, b) => acc + b.numberOfSeats, 0),
      waitlisted: relevantBookings.filter(b => b.status === 'Waitlisted').reduce((acc, b) => acc + b.numberOfSeats, 0),
      boarded,
      paidPassengers,
      tripsToday: todayTrips.length,
      delayedTrips: todayTrips.filter(s => s.status === 'Delayed').length,
      fleetReadiness: Math.round(readiness),
      activeVessels: inServiceCount
    };
  }, [date, bookings, allSchedules, boardingRecords, ships, staffData]);

  const chartData = useMemo(() => {
    if (!bookings || !ships || !allSchedules || !date) return { revenueData: [], routeData: [], fleetData: [], tripData: [] };

    // Revenue Trend
    const currentYear = getYear(new Date());
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(currentYear, i), 'MMM'),
      total: 0,
    }));
    bookings.forEach(b => {
      if (b.paymentStatus === 'Paid') {
        const d = b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate);
        if (isValid(d) && getYear(d) === currentYear) monthlyRevenue[getMonth(d)].total += b.totalPrice;
      }
    });

    // Route Popularity
    const routeCounts: Record<string, number> = {};
    bookings.forEach(b => { if (b.routeName) routeCounts[b.routeName] = (routeCounts[b.routeName] || 0) + b.numberOfSeats; });
    const routeData = Object.entries(routeCounts).map(([name, value], i) => ({ name, value, fill: chartColors[i % chartColors.length] })).sort((a,b) => b.value - a.value).slice(0, 5);

    // Fleet Status Pie
    const statusCounts: Record<string, number> = {};
    ships.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
    const fleetData = Object.entries(statusCounts).map(([name, value], i) => ({ name, value, fill: i === 0 ? "hsl(var(--primary))" : i === 1 ? "hsl(var(--accent))" : "hsl(var(--destructive))" }));

    return { revenueData: monthlyRevenue, routeData, fleetData };
  }, [bookings, ships, allSchedules, date]);

  const isLoading = isLoadingBookings || isLoadingSchedules || isLoadingBoarding || !date || isLoadingStaff || isLoadingShips;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maritime Operations Dashboard</h1>
          <p className="text-muted-foreground">Fleet status and passenger flow for {date && isValid(date) ? format(date, 'PPPP') : 'Today'}.</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="hidden sm:flex h-9 px-3 gap-1">
             <CheckCircle2 className="h-3 w-3 text-green-500" />
             System Live
           </Badge>
           <Input
            type="date"
            value={date && isValid(date) ? format(date, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
                if (e.target.value) {
                const [year, month, day] = e.target.value.split('-').map(Number);
                setDate(new Date(year, month - 1, day));
                }
            }}
            className="w-full sm:w-[160px] h-9 shadow-sm"
            />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40 mb-4" />
            <span className="text-muted-foreground font-medium">Synchronizing fleet data...</span>
        </div>
      ) : (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">₱{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Confirmed & Paid Transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Boarding Progress</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{stats.boarded} / {stats.paidPassengers}</div>
                        <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-primary transition-all" style={{ width: `${stats.paidPassengers > 0 ? (stats.boarded / stats.paidPassengers) * 100 : 0}%` }} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Waitlist Burden</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{stats.waitlisted} <span className="text-sm font-medium text-muted-foreground">pax</span></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Total across all {stats.tripsToday} scheduled trips</p>
                    </CardContent>
                </Card>
                <Card className={stats.fleetReadiness < 80 ? "border-l-4 border-l-destructive" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fleet Readiness</CardTitle>
                        <Ship className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-black">{stats.fleetReadiness}%</div>
                            <Badge variant={stats.fleetReadiness >= 90 ? "default" : "destructive"} className="text-[9px] py-0">{stats.activeVessels} Active</Badge>
                        </div>
                        {stats.delayedTrips > 0 && (
                            <p className="text-[10px] text-destructive font-bold mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> {stats.delayedTrips} Delayed Voyages
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Yearly Sales Momentum</CardTitle>
                        <CardDescription>Consolidated gross revenue for {getYear(new Date())}.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pl-2">
                        <ChartContainer config={{ total: { label: "Revenue" } }} className="h-full w-full">
                            <ResponsiveContainer>
                                <BarChart data={chartData.revenueData}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                                    <YAxis tickFormatter={(v) => `₱${v/1000}k`} axisLine={false} tickLine={false} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} content={<ChartTooltipContent formatter={(v) => `₱${v.toLocaleString()}`} />} />
                                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Vessel Utilization</CardTitle>
                        <CardDescription>Current status of the organization's private fleet.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {chartData.fleetData.length > 0 ? (
                            <ChartContainer config={{}} className="h-full w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={chartData.fleetData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                                            {chartData.fleetData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent nameKey="name" />} className="pt-4" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground italic text-sm">No vessel data indexed.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                 <Card className="lg:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Route Volume Analysis</CardTitle>
                        <CardDescription>Top 5 routes by total passenger bookings for {format(date, 'MMMM')}.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pl-2">
                        <ChartContainer config={{}} className="h-full w-full">
                            <ResponsiveContainer>
                                <BarChart data={chartData.routeData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} fontSize={10} width={120} stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {chartData.routeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 shadow-sm bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ship className="h-5 w-5" /> Operational Summary
                        </CardTitle>
                        <CardDescription>Quick performance check for {format(date, 'PP')}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Scheduled Voyages</span>
                            <span className="font-bold">{stats.tripsToday}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Total Occupancy</span>
                            <span className="font-bold">{stats.totalPassengers} pax</span>
                        </div>
                         <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Delayed %</span>
                            <span className={stats.delayedTrips > 0 ? "font-bold text-destructive" : "font-bold"}>
                                {stats.tripsToday > 0 ? Math.round((stats.delayedTrips / stats.tripsToday) * 100) : 0}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-sm font-medium">Waitlist Conversion</span>
                            <span className="text-xs text-muted-foreground italic">Auto-promotion enabled</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
      )}
    </div>
  );
}
