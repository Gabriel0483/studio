
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, Timestamp, query, where, doc } from 'firebase/firestore';
import { format, getMonth, getYear, isValid } from 'date-fns';
import { DollarSign, Users, Clock, ClipboardCheck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
    
    // Safety check: If not platform admin and no staff document found yet, wait or return null
    if (!staffData && !isPlatformAdmin) return null;

    const isFullAccess = roles.some(r => ['Super Admin', 'Operations Manager', 'Finance/Accounting'].includes(r)) || isPlatformAdmin;
    
    const baseCol = collection(firestore, 'bookings');
    
    if (isFullAccess) return baseCol;
    
    // Restricted roles must use filtered queries to satisfy security rules
    if (staffData?.assignedPortName) {
      return query(baseCol, where('departurePortName', '==', staffData.assignedPortName));
    }

    return null; // NO Access for other roles (e.g., Passengers, unassigned Crew)
  }, [firestore, user, staffData, isLoadingStaff]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection(bookingsQuery);
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]));
  const { data: boardingRecords, isLoading: isLoadingBoarding } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'boarding') : null, [firestore]));
  
  const filteredStats = useMemo(() => {
    const defaultStats = {
        totalRevenue: 0, totalPassengers: 0, waitlisted: 0, boarded: 0, paidPassengers: 0,
    };

    if (!bookings || !allSchedules || !boardingRecords || !date || !isValid(date)) {
      return defaultStats;
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd');

    const relevantBookings = bookings.filter(b => {
      const travelDate = b.travelDate instanceof Timestamp ? b.travelDate.toDate() : new Date(b.travelDate);
      return isValid(travelDate) && format(travelDate, 'yyyy-MM-dd') === selectedDateStr;
    });
    
    const paidReservedBookings = relevantBookings.filter(b => b.paymentStatus === 'Paid' && (b.status === 'Reserved' || b.status === 'Confirmed'));
    const paidPassengers = paidReservedBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);

    const relevantBoardingRecords = (boardingRecords || []).filter(br => {
        const schedule = allSchedules.find(s => s.id === br.scheduleId);
        return schedule && schedule.date === selectedDateStr;
    });

    const boarded = relevantBoardingRecords.filter(br => br.status === 'Boarded').length;
    const totalRevenue = relevantBookings
      .filter(b => b.paymentStatus === 'Paid')
      .reduce((acc, b) => acc + b.totalPrice, 0);

    const totalPassengers = relevantBookings.reduce((acc, b) => acc + b.numberOfSeats, 0);
    const waitlisted = relevantBookings.filter(b => b.status === 'Waitlisted').length;

    return {
      totalRevenue,
      totalPassengers,
      waitlisted,
      boarded,
      paidPassengers,
    };
  }, [date, bookings, allSchedules, boardingRecords]);

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
        if (isValid(bookingDate) && getYear(bookingDate) === currentYear) {
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

  const isLoading = isLoadingBookings || isLoadingSchedules || isLoadingBoarding || !date || isLoadingStaff;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Dashboard</h1>
          <p className="text-muted-foreground">Real-time status of shipping operations.</p>
        </div>
        <Input
          type="date"
          value={date && isValid(date) ? format(date, 'yyyy-MM-dd') : ''}
          onChange={(e) => {
            if (e.target.value) {
              const [year, month, day] = e.target.value.split('-').map(Number);
              setDate(new Date(year, month - 1, day));
            }
          }}
          className="w-full sm:w-[160px] h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex h-[256px] items-center justify-center rounded-lg border border-dashed">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading dashboard data...</span>
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
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passengers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{filteredStats.totalPassengers}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Waitlisted</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.waitlisted}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Boarded</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredStats.boarded} / {filteredStats.paidPassengers}</div>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
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
