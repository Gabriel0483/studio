
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const segments = pathname.split('/');
  const activeTab = segments[segments.length - 1];

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Operational Management</h1>
        <p className="text-muted-foreground">Manage your fleet, schedules, and maintenance.</p>
      </div>

      <Tabs value={activeTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ships" asChild>
            <Link href="/dashboard/operations/ships">Fleet</Link>
          </TabsTrigger>
          <TabsTrigger value="schedules" asChild>
            <Link href="/dashboard/operations/schedules">Schedules</Link>
          </TabsTrigger>
           <TabsTrigger value="maintenance" asChild>
            <Link href="/dashboard/operations/maintenance">Maintenance</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="pt-4">
        {children}
      </div>
    </div>
  );
}
