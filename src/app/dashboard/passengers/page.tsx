'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { passengers as allPassengers } from '@/lib/data';
import { Search } from 'lucide-react';

type Passenger = typeof allPassengers[0];

export default function PassengersPage() {
  const [search, setSearch] = useState('');

  const filteredPassengers = useMemo(() => {
    return allPassengers.filter((passenger) =>
      passenger.name.toLowerCase().includes(search.toLowerCase()) ||
      passenger.email.toLowerCase().includes(search.toLowerCase()) ||
      passenger.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Passenger Management</h1>
        <p className="text-muted-foreground">View, search, and manage passenger information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Passengers</CardTitle>
          <CardDescription>A list of all passengers with bookings.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or booking ID..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPassengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell className="font-medium">{passenger.id}</TableCell>
                  <TableCell>{passenger.name}</TableCell>
                  <TableCell>{passenger.email}</TableCell>
                  <TableCell>{passenger.route}</TableCell>
                  <TableCell>{passenger.date}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(passenger.status) as any}>{passenger.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPassengers.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                No passengers found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
