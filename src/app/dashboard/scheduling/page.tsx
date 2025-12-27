'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { getOptimizedSchedules, type FormState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Ship, Route, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Generate Schedule
    </Button>
  );
}

export default function SchedulingPage() {
  const initialState: FormState = { message: '' };
  const [state, formAction] = useActionState(getOptimizedSchedules, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if(state.message && state.message !== 'Successfully generated schedules.') {
      toast({
        variant: 'destructive',
        title: 'Error Generating Schedule',
        description: state.message + (state.issues ? ` ${state.issues.join(', ')}` : ''),
      });
    }
  }, [state, toast]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automated Scheduling</h1>
        <p className="text-muted-foreground">Use AI to generate optimized routes and schedules.</p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Scheduling Inputs</CardTitle>
              <CardDescription>Provide data for schedule optimization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passengerDemandData">Passenger Demand Data</Label>
                <Textarea id="passengerDemandData" name="passengerDemandData" placeholder="e.g., High demand for Island route on weekends. Low demand for Port route on Mondays." required />
                {state.fields?.passengerDemandData && <p className="text-sm text-destructive">{state.fields.passengerDemandData}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipAvailabilityData">Ship Availability Data</Label>
                <Textarea id="shipAvailabilityData" name="shipAvailabilityData" placeholder="e.g., Ship A (200 capacity) available. Ship B (150 capacity) in maintenance until Friday." required />
                {state.fields?.shipAvailabilityData && <p className="text-sm text-destructive">{state.fields.shipAvailabilityData}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="timingConstraints">Timing Constraints</Label>
                <Textarea id="timingConstraints" name="timingConstraints" placeholder="e.g., First departure at 8 AM. Last arrival at 10 PM. Turnaround time is 45 minutes." required />
                {state.fields?.timingConstraints && <p className="text-sm text-destructive">{state.fields.timingConstraints}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="currentBookingsData">Current Bookings Data (Optional)</Label>
                <Textarea id="currentBookingsData" name="currentBookingsData" placeholder="e.g., 150 bookings for Island route Saturday 10 AM. 20 for Port route Monday 8 AM."/>
              </div>
            </CardContent>
            <CardFooter>
              <SubmitButton />
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimized Schedule</CardTitle>
            <CardDescription>AI-powered suggestions will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.data ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Route className="h-5 w-5 text-primary" /> Optimized Schedules & Routes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.data.optimizedSchedules}</p>
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Ship className="h-5 w-5 text-primary" /> Estimated Cost Savings</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.data.estimatedCostSavings}</p>
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><BarChart className="h-5 w-5 text-primary" /> Improved Efficiency Metrics</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.data.improvedEfficiencyMetrics}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">Waiting for input...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
