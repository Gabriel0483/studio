'use client';

import React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, Shield, Info, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function PoliciesPage() {
  const firestore = useFirestore();

  const policiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'policies'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: policies, isLoading } = useCollection(policiesQuery);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Privacy Policy':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'Terms of Service':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      case 'Booking Policy':
        return <Info className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
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
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Policies</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Important information regarding our services, your privacy, and terms of use.
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading latest policies...</p>
              </div>
            ) : policies && policies.length > 0 ? (
              <div className="space-y-6">
                {policies.map((pol) => (
                  <Card key={pol.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-xl tracking-tight">{pol.title}</CardTitle>
                        <Badge variant="outline">{pol.category}</Badge>
                      </div>
                      <CardDescription>Last Updated: {formatDate(pol.createdAt)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{pol.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Policies Found</h3>
                <p className="text-sm text-muted-foreground">There are currently no policies posted. Please check back later.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

    