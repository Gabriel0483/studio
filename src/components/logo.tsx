import { Ship } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link href="/welcome" className="flex items-center gap-2" aria-label="Isla Konek Home">
      <Ship className="h-6 w-6 text-primary" />
      <span className={cn(
          "text-xl font-bold",
          "group-data-[collapsible=icon]/sidebar-wrapper:hidden",
        )}>Isla Konek</span>
    </Link>
  );
}
