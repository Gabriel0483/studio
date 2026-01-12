
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User, LogOut } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { handleSignOut } from '@/firebase/auth';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc } from 'firebase/firestore';

export function PublicHeader() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const passengerDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'passengers', user.uid);
  }, [firestore, user]);

  const { data: passengerData } = useDoc(passengerDocRef);

  const onSignOut = async () => {
    await handleSignOut();
    router.push('/');
  };
  
  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };
  
  const getDisplayName = () => {
    if (passengerData?.firstName) {
        return `${passengerData.firstName} ${passengerData.lastName || ''}`.trim();
    }
    return 'Passenger';
  };


  const navLinks = [
    { href: '/book', label: 'Book Now' },
    { href: '/status', label: 'Live Status' },
    { href: '/advisories', label: 'Advisories' },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 h-16">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            {!isUserLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/40/40`} alt="User" />
                        <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => router.push('/my-profile')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/my-bookings')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Bookings</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </>
              )
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="flex flex-col gap-6 pt-12">
                <Logo />
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-foreground hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
                 <div className="border-t pt-6 flex flex-col gap-4">
                  {!isUserLoading && (
                    user ? (
                      <>
                        <Button variant="outline" onClick={() => router.push('/my-profile')}>My Profile</Button>
                        <Button variant="outline" onClick={() => router.push('/my-bookings')}>My Bookings</Button>
                        <Button variant="secondary" onClick={onSignOut}>Log Out</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" asChild><Link href="/login">Login</Link></Button>
                        <Button asChild><Link href="/signup">Sign Up</Link></Button>
                      </>
                    )
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
