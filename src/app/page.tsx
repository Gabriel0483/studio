
'use client';

import React, { useEffect } from 'react';
import { useUser, useAuthContext } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProtectedRootPage() {
  const { user, isUserLoading } = useUser();
  const { isAuthReady } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isAuthReady && !isUserLoading) {
      if (user) {
        // If the user is logged in, redirect to their bookings.
        // This could be changed to a dashboard or another page.
        router.replace('/my-bookings');
      } else {
        // If no user, redirect to the new public welcome page.
        router.replace('/welcome');
      }
    }
  }, [isAuthReady, isUserLoading, user, router]);

  // Display a loading indicator while checking auth status.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Loading...</p>
    </div>
  );
}
