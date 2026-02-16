
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
import { TenantProvider } from '@/components/dashboard/tenant-context';

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
  const [tenantInfo, setTenantInfo] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });

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

        if (staffDoc.exists()) {
          const data = staffDoc.data();
          const roles = data.roles || [];
          if (roles.length > 0) {
            setTenantInfo({ 
              id: data.tenantId || 'platform-default', 
              name: data.tenantName || 'Isla Konek Operator' 
            });
            setAuthStatus('authorized');
            return;
          }
        }
        
        // Platform Admin Fallback
        if (user.email === 'rielmagpantay@gmail.com') {
          setTenantInfo({ id: 'platform-admin', name: 'Platform Administrator' });
          setAuthStatus('authorized');
          return;
        }

        setAuthStatus('unauthorized');
        router.replace('/admin/login');
      };

      checkAccess();
    } else {
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
    <TenantProvider tenantId={tenantInfo.id} tenantName={tenantInfo.name}>
      <SidebarProvider>
        <Sidebar>
          <SidebarRail />
          <SidebarHeader className='p-2'>
            <div className="flex flex-col gap-1 px-2 py-1">
              <Logo />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                {tenantInfo.name}
              </p>
            </div>
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
    </TenantProvider>
  );
}
