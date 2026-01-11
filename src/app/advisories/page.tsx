'use client';

import React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Megaphone, AlertTriangle, Info, Ship } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function AdvisoriesPage() {
  const firestore = useFirestore();

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection(announcementsQuery);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Weather Update':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Route Change':
        return <Ship className="h-5 w-5 text-blue-500" />;
      case 'Fare Change':
        return <Info className="h-5 w-5 text-green-500" />;
      case 'Service Disruption':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Megaphone className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP p');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-secondary">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Public Advisories</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                The latest announcements and service updates from Isla Konek.
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading latest advisories...</p>
              </div>
            ) : announcements && announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((ann) => (
                  <Card key={ann.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-xl tracking-tight">{ann.title}</CardTitle>
                        <Badge variant="outline">{ann.category}</Badge>
                      </div>
                      <CardDescription>{formatDate(ann.createdAt)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ann.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed">
                <Megaphone className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Active Advisories</h3>
                <p className="text-sm text-muted-foreground">There are currently no public announcements. Please check back later.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
