'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { revenueData, bookingsData } from "@/lib/data";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const bookingsChartConfig = {
  value: {
    label: "Bookings",
  },
  ...bookingsData.reduce((acc, cur) => {
    acc[cur.name] = {
      label: cur.name,
      color: cur.fill,
    };
    return acc;
  }, {} as ChartConfig),
} satisfies ChartConfig;


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
            <CardTitle>Bookings by Route</CardTitle>
            <CardDescription>A breakdown of passenger bookings across different routes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bookingsChartConfig} className="h-[350px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie data={bookingsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} >
                           {bookingsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
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
