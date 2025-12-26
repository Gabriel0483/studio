'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { revenueData, bookingsData } from "@/lib/data";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate reports and gain insights into your business performance.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Revenue Report
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Bookings Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Passenger Growth Over Time</CardTitle>
            <CardDescription>Monthly new passenger registrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={revenueData.map(d => ({ ...d, passengers: Math.floor(d.total / 20) + 50 }))}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} />
                <Legend />
                <Line type="monotone" dataKey="passengers" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Booking Hours</CardTitle>
            <CardDescription>Analysis of booking activity by time of day.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={[
                { hour: '8am', bookings: 65 }, { hour: '9am', bookings: 92 }, { hour: '10am', bookings: 120 },
                { hour: '11am', bookings: 110 }, { hour: '12pm', bookings: 130 }, { hour: '1pm', bookings: 105 },
                { hour: '2pm', bookings: 95 }, { hour: '3pm', bookings: 88 }, { hour: '4pm', bookings: 115 },
                { hour: '5pm', bookings: 140 }, { hour: '6pm', bookings: 125 },
              ]}>
                <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} />
                <Legend />
                <Bar dataKey="bookings" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
