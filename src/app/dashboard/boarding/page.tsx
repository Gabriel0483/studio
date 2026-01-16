
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarClock, Loader2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function BoardingPage() {
  const firestore = useFirestore();
  const router = useRouter();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'schedules'), where('date', '==', todayStr));
  }, [firestore, todayStr]);
  
  const routesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'routes');
  }, [firestore]);

  const { data: schedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);

  const todaySchedules = useMemo(() => {
    if (!schedules) return [];
    
    return schedules
        .filter(schedule => schedule.status !== 'Departed' && schedule.status !== 'Arrived')
        .sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  }, [schedules]);

  const getRouteName = (routeId: string) => routes?.find(r => r.id === routeId)?.name || 'Unknown Route';

  const getBoardingStatusVariant = (status?: string) => {
    switch(status) {
      case 'Boarding':
        return 'default';
      case 'Boarding Closed':
        return 'destructive';
      case 'Departed':
        return 'secondary';
      default: // Awaiting
        return 'outline';
    }
  }

  const isLoading = isLoadingSchedules || isLoadingRoutes;

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading today's trips...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Boarding Management</h1>
        <p className="text-muted-foreground">
          View all active and upcoming trips for today, {format(new Date(), 'PPP')}.
        </p>
      </div>

      {todaySchedules.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {todaySchedules.map(schedule => (
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
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Boarding Status</p>
                  <Badge variant={getBoardingStatusVariant(schedule.boardingStatus)}>{schedule.boardingStatus || 'Awaiting'}</Badge>
                </div>
                <Button className="w-full" onClick={() => router.push(`/dashboard/boarding/${schedule.id}`)}>
                  {schedule.boardingStatus === 'Boarding' ? 'View Manifest' : 'Manage Trip'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed">
            <CalendarClock className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No More Trips Today</h3>
            <p className="text-sm text-muted-foreground">All scheduled trips for today have departed or there are no more trips scheduled.</p>
        </div>
      )}
    </div>
  );
}
