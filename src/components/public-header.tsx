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
          <Button asChild variant="outline">
            <Link href="/book">Book Now</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </nav>
        <div className="md:hidden">
            <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
