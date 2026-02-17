
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShipsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the correct location within Operations
    router.replace('/dashboard/operations/ships');
  }, [router]);

  return null;
}
