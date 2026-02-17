
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TenantProvider } from '@/components/dashboard/tenant-context';
import { Loader2 } from 'lucide-react';

export default function OperatorPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading } = useDoc(tenantRef);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading operator portal...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="text-4xl font-bold text-destructive">404</h1>
        <p className="text-xl font-semibold mt-2">Operator Not Found</p>
        <p className="text-muted-foreground mt-1">The shipping company you are looking for does not exist on our platform.</p>
      </div>
    );
  }

  return (
    <TenantProvider 
      tenantId={tenant.id} 
      tenantName={tenant.name}
      logoUrl={tenant.logoUrl}
      heroTitle={tenant.heroTitle}
      heroDescription={tenant.heroDescription}
      heroImageUrl={tenant.heroImageUrl}
    >
      {children}
    </TenantProvider>
  );
}
