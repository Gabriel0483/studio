'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { staff } from '@/lib/data';

type Staff = typeof staff[0];

export default function StaffPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Assignments</CardTitle>
        <CardDescription>Current assignments for all staff members.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assignment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((person: Staff) => (
              <TableRow key={person.id}>
                <TableCell className="font-medium">{person.id}</TableCell>
                <TableCell>{person.name}</TableCell>
                <TableCell>{person.role}</TableCell>
                <TableCell>{person.assignment}</TableCell>
              </TableRow>
            ))}
            {staff.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <p className="text-muted-foreground">No staff data available.</p>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
