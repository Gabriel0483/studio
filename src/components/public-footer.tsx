import { Logo } from '@/components/logo';

export function PublicFooter() {
  return (
    <footer className="w-full border-t">
      <div className="container mx-auto flex items-center justify-between px-4 py-6 md:px-6">
        <Logo />
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Isla Konek. All rights reserved.</p>
      </div>
    </footer>
  );
}
