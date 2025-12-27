import { Ship } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="TransitFlow Home">
      <Ship className="h-6 w-6 text-primary" />
      <span className={cn(
          "text-xl font-bold text-primary-foreground sm:text-primary",
          "group-data-[collapsible=icon]/sidebar-wrapper:hidden",
          "group-data-[collapsible=offcanvas]/sidebar-wrapper:sm:text-primary",
          "group-data-[collapsible=offcanvas]/sidebar-wrapper:text-primary-foreground",
        )}>TransitFlow</span>
    </Link>
  );
}
