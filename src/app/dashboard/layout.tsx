
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/dashboard/user-nav';
import { navLinks } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Home, Loader2 } from 'lucide-react';
import { useUser, useAuthContext, initializeFirebase } from '@/firebase';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';


const hasAdminRole = async (user: User): Promise<boolean> => {
    // Fallback for the initial super admin
    if (user.email === 'rielmagpantay@gmail.com') return true;

    try {
        // We need a firestore instance here. Since this is not a component, we can't use hooks.
        const { firestore } = initializeFirebase();
        const staffDocRef = doc(firestore, 'staff', user.uid);
        const staffDoc = await getDoc(staffDocRef);

        if (staffDoc.exists()) {
            const roles = staffDoc.data().roles || [];
            // Any assigned role grants dashboard access. Finer control is handled by security rules.
            return roles.length > 0;
        }
        return false;
    } catch (error) {
        console.error('Error checking for admin role in Firestore:', error);
        return false;
    }
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { isAuthReady } = useAuthContext();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    if (!isAuthReady || isUserLoading) {
      setAuthStatus('checking');
      return;
    }

    if (user) {
      hasAdminRole(user).then(isAdmin => {
        if (isAdmin) {
          setAuthStatus('authorized');
        } else {
          console.warn('User does not have an admin role. Redirecting to login.');
          setAuthStatus('unauthorized');
          router.replace('/admin/login');
        }
      });
    } else {
      console.log('No user found after auth ready. Redirecting to login.');
      setAuthStatus('unauthorized');
      router.replace('/admin/login');
    }
  }, [user, isAuthReady, isUserLoading, router]);

  if (authStatus !== 'authorized') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">
          {authStatus === 'checking' ? 'Verifying access...' : 'Redirecting...'}
        </p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarRail />
        <SidebarHeader className='p-2'>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(link.href)}
                  tooltip={{ children: link.label }}
                >
                  <Link href={link.href}>
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger />
            <div className='hidden md:block'>
                <Button asChild variant="outline" size="icon">
                    <Link href="/welcome">
                        <Home className="h-4 w-4"/>
                        <span className="sr-only">Back to Homepage</span>
                    </Link>
                </Button>
            </div>
          <div className="w-full flex-1">
          </div>
          <UserNav />
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
