
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
import { useUser, useAuthContext } from '@/firebase';
import type { User } from 'firebase/auth';

const isAdminUser = async (user: User): Promise<boolean> => {
  try {
    // Force refresh the token to get the latest custom claims.
    const idTokenResult = await user.getIdTokenResult(true);
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error getting user token for admin check:', error);
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
    // Wait until Firebase has finished its initial auth check.
    if (!isAuthReady || isUserLoading) {
      setAuthStatus('checking');
      return;
    }

    if (user) {
      // If a user is found, check if they are an admin.
      isAdminUser(user).then(isAdmin => {
        if (isAdmin) {
          // If they are an admin, authorize access.
          setAuthStatus('authorized');
        } else {
          // If not an admin, deny access and redirect.
          console.warn('User is not an admin. Redirecting to login.');
          setAuthStatus('unauthorized');
          router.replace('/admin/login');
        }
      });
    } else {
      // If no user is found after auth is ready, deny access.
      console.log('No user found after auth ready. Redirecting to login.');
      setAuthStatus('unauthorized');
      router.replace('/admin/login');
    }
  }, [user, isAuthReady, isUserLoading, router]);

  // Render a loading screen while checking authentication and authorization.
  // This prevents child components from rendering and attempting to fetch data prematurely.
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

  // Only render the dashboard content if the user is fully authorized.
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
                  isActive={pathname === link.href}
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
