
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Ship } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTenant } from '@/components/dashboard/tenant-context';

export default function StatusPage() {
  const firestore = useFirestore();
  const { tenantId, tenantName } = useTenant();
  const [todayStr, setTodayStr] = useState<string | null>(null);
  const [filterRouteId, setFilterRouteId] = useState('all');

  useEffect(() => {
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'schedules'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId]);
  
  const routesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'routes'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId]);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);

  const todaySchedules = useMemo(() => {
    if (!allSchedules || !todayStr) return [];
    
    const specialTripsForToday = allSchedules.filter(s => s.tripType === 'Special' && s.date === todayStr);
    const dailyTrips = allSchedules.filter(s => s.tripType === 'Daily');

    const dailyInstancesForToday = dailyTrips.map(daily => {
        const existingInstance = specialTripsForToday.find(st => st.sourceScheduleId === daily.id);
        return existingInstance || daily;
    });

    let combinedSchedules = [...specialTripsForToday.filter(st => !st.sourceScheduleId), ...dailyInstancesForToday];

    if (filterRouteId !== 'all') {
        combinedSchedules = combinedSchedules.filter(schedule => schedule.routeId === filterRouteId);
    }
    
    return combinedSchedules.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [allSchedules, todayStr, filterRouteId]);

  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'On Time': return 'default';
      case 'Delayed':
      case 'Cancelled': return 'destructive';
      case 'Departed':
      case 'Arrived': return 'secondary';
      default: return 'outline';
    }
  };
  
  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    try {
        const date = new Date(`1970-01-01T${timeString}`);
        return format(date, 'p');
    } catch { return "Invalid Time"; }
  };

  const isLoading = isLoadingSchedules || isLoadingRoutes || !todayStr;

  return (
    <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1 bg-secondary">
            <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
                <Card className="mx-auto max-w-4xl">
                    <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Live Trip Status</CardTitle>
                    <CardDescription>
                        Real-time updates for {tenantName} trips scheduled for today.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="mb-6">
                        <Label htmlFor="filter-route">Filter by Route</Label>
                        <Select value={filterRouteId} onValueChange={setFilterRouteId}>
                            <SelectTrigger id="filter-route" className="w-full sm:w-[300px] mt-1">
                                <SelectValue placeholder="Filter by route..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Routes</SelectItem>
                                {routes?.map((route) => <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Route</TableHead>
                            <TableHead>Departure</TableHead>
                            <TableHead>Arrival (Est.)</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            </TableCell>
                            </TableRow>
                        ) : todaySchedules.length > 0 ? (
                            todaySchedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                                <TableCell className="font-medium">{getRouteName(schedule.routeId)}</TableCell>
                                <TableCell>{formatTime(schedule.departureTime)}</TableCell>
                                <TableCell>{formatTime(schedule.arrivalTime)}</TableCell>
                                <TableCell className="text-right">
                                <Badge variant={getStatusVariant(schedule.status || 'On Time')}>
                                    {schedule.status || 'On Time'}
                                </Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                <div className="flex flex-col items-center gap-2">
                                <Ship className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">No trips scheduled for today.</p>
                                </div>
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </div>
        </main>
      <PublicFooter />
    </div>
  );
}
