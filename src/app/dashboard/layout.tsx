
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
import { useUser } from '@/firebase';
import type { User } from 'firebase/auth';

const isAdminUser = async (user: User): Promise<boolean> => {
  if (user.email === 'rielmagpantay@gmail.com') {
    return true;
  }
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
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    // This effect should only run when the user loading state changes.
    if (isUserLoading) {
      // If we are still loading user data, keep showing the loading screen.
      setAuthStatus('checking');
      return;
    }

    if (user) {
      // User object is available, now we can safely check for admin status.
      isAdminUser(user).then(isAdmin => {
        if (isAdmin) {
          setAuthStatus('authorized');
        } else {
          // User is logged in but is not an admin.
          console.warn('User is not an admin. Redirecting.');
          setAuthStatus('unauthorized');
          router.replace('/admin/login');
        }
      });
    } else {
      // No user is logged in after loading has finished.
      console.log('No user found. Redirecting to login.');
      setAuthStatus('unauthorized');
      router.replace('/admin/login');
    }
  }, [user, isUserLoading, router]);

  // While checking or if unauthorized, show a loading/redirecting screen.
  // This prevents any child components from rendering prematurely.
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

  // Only render the full dashboard layout and its children if authorized.
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
                    <Link href="/">
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
