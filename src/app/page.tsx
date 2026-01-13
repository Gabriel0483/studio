
'use client';

import React, { useEffect } from 'react';
import { useUser, useAuthContext } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootRedirectPage() {
  const { user, isUserLoading } = useUser();
  const { isAuthReady } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial authentication check is complete.
    if (isAuthReady && !isUserLoading) {
      if (user) {
        // If the user is already logged in, redirect them to their bookings.
        router.replace('/my-bookings');
      } else {
        // If no user is signed in, this is their first visit or they've logged out.
        // Redirect them to the main login page.
        router.replace('/login');
      }
    }
  }, [isAuthReady, isUserLoading, user, router]);

  // Display a loading indicator while the authentication status is being checked.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Initializing...</p>
    </div>
  );
}
