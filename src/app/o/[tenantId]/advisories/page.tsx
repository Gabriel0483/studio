'use client';

import React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Megaphone, AlertTriangle, Info, Ship } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function AdvisoriesPage() {
  const firestore = useFirestore();

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'announcements'), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection(announcementsQuery);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Weather Update':
      case 'Service Disruption': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'Route Change': return <Ship className="h-5 w-5 text-blue-500" />;
      default: return <Megaphone className="h-5 w-5 text-gray-500" />;
    }
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
                Official announcements and service updates from the fleet.
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : announcements && announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((ann) => (
                  <Card key={ann.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(ann.category)}
                          <CardTitle className="text-xl">{ann.title}</CardTitle>
                        </div>
                        <Badge variant="outline">{ann.category}</Badge>
                      </div>
                      <CardDescription>{ann.createdAt ? format(ann.createdAt.toDate(), 'PPP p') : 'N/A'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-muted-foreground">{ann.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Active Advisories</h3>
                <p className="text-sm text-muted-foreground">Check back later for any updates.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
