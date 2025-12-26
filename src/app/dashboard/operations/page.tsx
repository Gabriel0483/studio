import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ships, staff } from '@/lib/data';

type Ship = typeof ships[0];
type Staff = typeof staff[0];

export default function OperationsPage() {

  const getShipStatusVariant = (status: string) => {
    switch (status) {
      case 'In Service':
        return 'default';
      case 'Maintenance':
        return 'secondary';
      case 'Dry Dock':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operational Management</h1>
        <p className="text-muted-foreground">Manage your fleet and staff assignments.</p>
      </div>

      <Tabs defaultValue="ships">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="ships">Ship Management</TabsTrigger>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
        </TabsList>
        <TabsContent value="ships">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Status</CardTitle>
              <CardDescription>An overview of all ships in your fleet.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ship ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Next Maintenance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ships.map((ship: Ship) => (
                    <TableRow key={ship.id}>
                      <TableCell className="font-medium">{ship.id}</TableCell>
                      <TableCell>{ship.name}</TableCell>
                      <TableCell>
                        <Badge variant={getShipStatusVariant(ship.status) as any}>{ship.status}</Badge>
                      </TableCell>
                      <TableCell>{ship.capacity}</TableCell>
                      <TableCell>{ship.nextMaintenance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="staff">
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
