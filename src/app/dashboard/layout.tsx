'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/dashboard/user-nav';
import { navLinks, APP_VERSION } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Home, Loader2, Info, ShieldAlert, LogOut } from 'lucide-react';
import { useUser, useAuthContext, initializeFirebase, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { handleSignOut } from '@/firebase/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { isAuthReady } = useAuthContext();
  
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');
  const [staffInfo, setStaffInfo] = useState<{ roles: string[] }>({ roles: [] });

  useEffect(() => {
    if (!isAuthReady || isUserLoading) {
      setAuthStatus('checking');
      return;
    }

    if (user) {
      const checkAccess = async () => {
        const { firestore } = initializeFirebase();
        const staffDocRef = doc(firestore, 'staff', user.uid);
        const staffDoc = await getDoc(staffDocRef);

        // Platform Admin check (emails allowed even without document)
        const adminEmails = ['rielmagpantay@gmail.com', 'mariel.dumaoal@gmail.com'];
        const isPlatformAdmin = user.email && adminEmails.includes(user.email);

        if (staffDoc.exists()) {
          const data = staffDoc.data();
          setStaffInfo({ roles: data.roles || [] });
          setAuthStatus('authorized');
        } else if (isPlatformAdmin) {
          setStaffInfo({ roles: ['Super Admin'] });
          setAuthStatus('authorized');
        } else {
          setAuthStatus('unauthorized');
        }
      };

      checkAccess();
    } else {
      // Not logged in at all - safe to redirect to login
      router.replace('/admin/login');
    }
  }, [user, isAuthReady, isUserLoading, router]);

  const filteredLinks = useMemo(() => {
    return navLinks.filter(link => {
      if (link.roles) {
        return link.roles.some(role => staffInfo.roles.includes(role));
      }
      return true;
    });
  }, [staffInfo.roles]);

  const onSignOutAndRedirect = async () => {
    await handleSignOut(auth);
    router.replace('/admin/login');
  };

  // 1. Initial Loading State
  if (authStatus === 'checking') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Verifying secure access...
        </p>
      </div>
    );
  }

  // 2. Unauthorized State (Logged in but not staff)
  // This view prevents the infinite redirect loop
  if (authStatus === 'unauthorized') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          Your account ({user?.email}) is not authorized to access the Isla Konek Command Center. 
          Please contact your administrator for provisioning.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={onSignOutAndRedirect}>
            <LogOut className="mr-2 h-4 w-4" />
            Switch Account
          </Button>
          <Button asChild>
            <Link href="/welcome">Return to Portal</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Authorized State
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarRail />
        <SidebarHeader className='p-2'>
          <div className="flex flex-col gap-1 px-2 py-1">
            <Logo />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Maritime Command
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))}
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
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            <Info className="h-3 w-3" />
            <span>System {APP_VERSION}</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger />
            <div className='hidden md:block'>
                <Button asChild variant="outline" size="sm">
                    <Link href="/welcome">
                        <Home className="mr-2 h-4 w-4"/>
                        Portal
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
