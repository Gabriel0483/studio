
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
  // Always check the hardcoded email first as a reliable fallback.
  if (user.email === 'rielmagpantay@gmail.com') {
    return true;
  }
  try {
    const idTokenResult = await user.getIdTokenResult();
    // Check for the admin custom claim.
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  useEffect(() => {
    // Only perform the check once the user object is available.
    if (!isUserLoading) {
      if (user) {
        isAdminUser(user).then(isAdmin => {
          if (isAdmin) {
            setIsAuthorized(true);
          } else {
            // If not an admin, deny access.
            router.replace('/admin/login');
          }
          setAuthCheckCompleted(true);
        });
      } else {
        // If no user is logged in, redirect to login.
        router.replace('/admin/login');
        setAuthCheckCompleted(true);
      }
    }
  }, [user, isUserLoading, router]);

  // While checking for authorization, show a loading screen.
  // This prevents any child components from rendering prematurely.
  if (!authCheckCompleted || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Verifying access...</p>
      </div>
    );
  }

  // Only render the dashboard if the user is authorized.
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
