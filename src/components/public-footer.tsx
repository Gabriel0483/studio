import { Logo } from '@/components/logo';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="w-full border-t">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between px-4 py-6 md:px-6 gap-4">
        <Logo />
        <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/advisories" className="hover:text-primary">Advisories</Link>
        </div>
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Isla Konek. All rights reserved.</p>
      </div>
    </footer>
  );
}
