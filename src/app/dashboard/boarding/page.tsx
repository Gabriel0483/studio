
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarClock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BoardingPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const [date, setDate] = useState<Date>();
  const [filterRouteId, setFilterRouteId] = useState('all');

  useEffect(() => {
    setDate(new Date());
  }, []);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Fetch all schedules, as we need to process daily templates.
    return collection(firestore, 'schedules');
  }, [firestore]);
  
  const routesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'routes');
  }, [firestore]);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);

  const selectedDateSchedules = useMemo(() => {
    if (!allSchedules || !date) return [];
    
    const selectedDateStr = format(date, 'yyyy-MM-dd');
    
    const specialTripsForDate = allSchedules.filter(s => s.tripType === 'Special' && s.date === selectedDateStr);
    const dailyTrips = allSchedules.filter(s => s.tripType === 'Daily');

    // For each daily trip, check if a special instance already exists for the selected date. If so, use that instance.
    // Otherwise, use the daily template itself so it can be managed.
    const dailyInstancesForDate = dailyTrips.map(daily => {
        const existingInstance = specialTripsForDate.find(st => st.sourceScheduleId === daily.id);
        return existingInstance || daily;
    });

    let combinedSchedules = [
        ...specialTripsForDate.filter(st => !st.sourceScheduleId), // Standalone special trips
        ...dailyInstancesForDate
    ];

    if (filterRouteId !== 'all') {
        combinedSchedules = combinedSchedules.filter(schedule => schedule.routeId === filterRouteId);
    }
    
    return combinedSchedules
        .sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  }, [allSchedules, date, filterRouteId]);

  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  const getStatusVariant = (status?: string) => {
    switch(status) {
      case 'On Time':
      case 'Boarding':
        return 'default';
      case 'Boarding Closed':
        return 'destructive';
      case 'Departed':
      case 'Arrived':
        return 'secondary';
      case 'Cancelled':
      case 'Delayed':
        return 'destructive';
      default: // Awaiting
        return 'outline';
    }
  };

  const handleManageTrip = (scheduleId: string) => {
    if (!date) return;
    const dateParam = format(date, 'yyyy-MM-dd');
    router.push(`/dashboard/boarding/${scheduleId}?date=${dateParam}`);
  };

  const isLoading = isLoadingSchedules || isLoadingRoutes || !date;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trip Management</h1>
          <p className="text-muted-foreground">
            View and manage all trips for the selected date.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-2 w-full sm:w-auto">
            <div>
                <Label htmlFor="trip-date">Date</Label>
                <Input
                    id="trip-date"
                    type="date"
                    value={date ? format(date, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                        if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            setDate(new Date(year, month - 1, day));
                        }
                    }}
                    className="w-full sm:w-auto"
                />
            </div>
            <div>
                <Label htmlFor="filter-route">Route</Label>
                <Select value={filterRouteId} onValueChange={setFilterRouteId} disabled={isLoadingRoutes}>
                    <SelectTrigger id="filter-route" className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Filter by route..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Routes</SelectItem>
                        {routes?.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                                {route.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Loading trips for {date ? format(date, 'PPP') : 'today'}...</p>
        </div>
      ) : selectedDateSchedules.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {selectedDateSchedules.map(schedule => (
            <Card key={schedule.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="tracking-tight">{getRouteName(schedule.routeId)}</CardTitle>
                <CardDescription>
                  Departs at {schedule.departureTime}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 flex-1">
                 <div className="text-sm text-muted-foreground">
                    <p>Ship: {schedule.shipName || 'Unassigned'}</p>
                    <p>Seats Available: {schedule.availableSeats}</p>
                 </div>
              </CardContent>
              <CardFooter className="flex-col items-start gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusVariant(schedule.status || 'On Time')}>{schedule.status || 'On Time'}</Badge>
                  <Badge variant={getStatusVariant(schedule.boardingStatus)}>{schedule.boardingStatus || 'Awaiting'}</Badge>
                </div>
                <Button className="w-full" onClick={() => handleManageTrip(schedule.id)}>
                  Manage Trip
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed">
            <CalendarClock className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Trips Scheduled</h3>
            <p className="text-sm text-muted-foreground">
                There are no trips scheduled for {date ? format(date, 'PPP') : ''}
                {filterRouteId !== 'all' && routes ? ` on the ${routes.find(r => r.id === filterRouteId)?.name} route` : ''}.
            </p>
        </div>
      )}
    </div>
  );
}

    