'use client';

import React, { useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

const CONDITIONS_DOC_ID = 'booking-conditions';

export default function ConditionsPage() {
  const firestore = useFirestore();

  const conditionsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'siteContent', CONDITIONS_DOC_ID);
  }, [firestore]);

  const { data: conditions, isLoading } = useDoc(conditionsDocRef);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-secondary">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold tracking-tight">Booking Conditions</CardTitle>
                {conditions && (
                    <CardDescription>
                        Last updated on {formatDate(conditions.lastUpdatedAt)}
                    </CardDescription>
                )}
              </CardHeader>
              <CardContent className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                {isLoading ? (
                  <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2">Loading conditions...</p>
                  </div>
                ) : conditions ? (
                  <div dangerouslySetInnerHTML={{ __html: conditions.content.replace(/\n/g, '<br />') }} />
                ) : (
                  <p>No booking conditions have been set up yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
