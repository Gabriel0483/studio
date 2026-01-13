
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect users from the root to the main public welcome page.
    router.replace('/welcome');
  }, [router]);

  // Display a loading indicator while the redirect is happening.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Initializing...</p>
    </div>
  );
}
