import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export function PublicHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 py-4">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Features
          </Link>
           <Link href="/book" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Book Now
          </Link>
           <Link href="/status" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Live Status
          </Link>
          <Link href="/advisories" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Advisories
          </Link>
          <Button asChild variant="outline">
            <Link href="/dashboard">Login</Link>
          </Button>
        </nav>
         <Button asChild className="md:hidden">
            <Link href="/dashboard">Login</Link>
        </Button>
      </div>
    </header>
  );
}
