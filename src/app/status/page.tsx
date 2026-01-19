
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Ship, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function StatusPage() {
  const firestore = useFirestore();
  const [todayFormatted, setTodayFormatted] = useState<string | null>(null);

  useEffect(() => {
    // This ensures the date is only formatted on the client, after initial hydration.
    setTodayFormatted(format(new Date(), 'PPP'));
  }, []);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Query for all schedule templates and any special schedules for today
  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'schedules');
  }, [firestore]);
  

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]));

  const todaySchedules = useMemo(() => {
    if (!allSchedules) return [];
    
    const specialTripsForToday = allSchedules.filter(s => s.tripType === 'Special' && s.date === todayStr);
    const dailyTrips = allSchedules.filter(s => s.tripType === 'Daily');

    // For each daily trip, check if a special instance already exists for today. If so, use it. Otherwise, use the template.
    const dailyInstancesForToday = dailyTrips.map(daily => {
        const existingInstance = specialTripsForToday.find(st => st.sourceScheduleId === daily.id);
        return existingInstance || daily;
    });

    return [...specialTripsForToday.filter(st => !st.sourceScheduleId), ...dailyInstancesForToday]
        .sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [allSchedules, todayStr]);

  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'On Time':
        return 'default';
      case 'Delayed':
        return 'destructive';
      case 'Departed':
      case 'Arrived':
        return 'secondary';
       case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    try {
        const date = new Date(`1970-01-01T${timeString}`);
        return format(date, 'p');
    } catch {
        return "Invalid Time";
    }
  };


  const isLoading = isLoadingSchedules || isLoadingRoutes;

  return (
    <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1 bg-secondary">
            <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
                <Card className="mx-auto max-w-4xl">
                    <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Live Trip Status</CardTitle>
                    <CardDescription>
                        Real-time updates for all trips scheduled for today{todayFormatted ? `, ${todayFormatted}` : '.'}
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Route</TableHead>
                            <TableHead>Departure</TableHead>
                            <TableHead>Arrival (Est.)</TableHead>
                            <TableHead>Ship</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex justify-center items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <p>Loading live trip data...</p>
                                </div>
                            </TableCell>
                            </TableRow>
                        ) : todaySchedules.length > 0 ? (
                            todaySchedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                                <TableCell className="font-medium">{getRouteName(schedule.routeId)}</TableCell>
                                <TableCell>{formatTime(schedule.departureTime)}</TableCell>
                                <TableCell>{formatTime(schedule.arrivalTime)}</TableCell>
                                <TableCell>{schedule.shipName || 'TBA'}</TableCell>
                                <TableCell className="text-right">
                                <Badge variant={getStatusVariant(schedule.status || 'On Time')}>
                                    {schedule.status || 'On Time'}
                                </Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
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
    
