'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, CalendarIcon, Loader2, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';

export function RouteSelection() {
  const firestore = useFirestore();
  const router = useRouter();

  const portsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'ports') : null),
    [firestore]
  );
  const routesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'routes') : null),
    [firestore]
  );

  const { data: ports, isLoading: isLoadingPorts } = useCollection(portsQuery);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesQuery);

  const [departurePort, setDeparturePort] = useState<string>('');
  const [arrivalPort, setArrivalPort] = useState<string>('');
  const [travelDate, setTravelDate] = useState<Date | undefined>(new Date());

  const isLoading = isLoadingPorts || isLoadingRoutes;

  const handleSearch = () => {
    if (!departurePort || !arrivalPort || !travelDate) {
      // Maybe show a toast message
      return;
    }

    const route = routes?.find(r => r.departure === departurePort && r.destination === arrivalPort);
    
    if (!route) {
        // Maybe show a toast that no such route exists
        console.warn("No route found for selected ports");
        return;
    }

    const queryParams = new URLSearchParams({
      routeId: route.id,
      date: format(travelDate, 'yyyy-MM-dd'),
    });

    router.push(`/book?${queryParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading routes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Departure Port</Label>
        <Select value={departurePort} onValueChange={setDeparturePort}>
          <SelectTrigger>
            <SelectValue placeholder="Select departure port" />
          </SelectTrigger>
          <SelectContent>
            {ports?.map((port) => (
              <SelectItem key={port.id} value={port.name}>
                {port.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Arrival Port</Label>
        <Select value={arrivalPort} onValueChange={setArrivalPort}>
          <SelectTrigger>
            <SelectValue placeholder="Select arrival port" />
          </SelectTrigger>
          <SelectContent>
            {ports?.map((port) => (
              <SelectItem key={port.id} value={port.name}>
                {port.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Travel Date</Label>
         <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !travelDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {travelDate ? format(travelDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={travelDate}
                onSelect={setTravelDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
      </div>
      <Button
        size="lg"
        className="w-full group"
        onClick={handleSearch}
        disabled={!departurePort || !arrivalPort || !travelDate || !routes?.find(r => r.departure === departurePort && r.destination === arrivalPort)}
      >
        Find a Ferry <Navigation className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Button>
      {!isLoading && departurePort && arrivalPort && !routes?.find(r => r.departure === departurePort && r.destination === arrivalPort) && (
        <p className="text-center text-sm text-destructive">No direct route available for the selected ports.</p>
      )}
    </div>
  );
}