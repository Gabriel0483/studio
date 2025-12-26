import { Ship } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="TransitFlow Home">
      <Ship className="h-6 w-6 text-primary" />
      <span className="text-xl font-bold text-primary-foreground sm:text-primary">TransitFlow</span>
    </Link>
  );
}
