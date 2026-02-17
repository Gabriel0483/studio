
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { Ship, Building2, Ticket, ShieldCheck } from 'lucide-react';

const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full pt-24 pb-12 md:pt-40 md:pb-20 lg:pt-48 lg:pb-28">
           <div className="absolute inset-0 -z-10">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                data-ai-hint={heroImage.imageHint}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="flex flex-col items-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Your Island Adventure Awaits
              </h1>
              <p className="max-w-3xl text-lg text-muted-foreground md:text-xl">
                Effortless ferry bookings with Isla Konek. Book your tickets in minutes and enjoy real-time trip updates for a stress-free journey.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/book">Book a Seat Online</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                   <Link href="/status">View Live Trip Status</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* For Operators Section */}
        <section className="w-full py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge className="mb-4">For Ferry Operators</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Digitalize Your Shipping Operations</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Isla Konek provides a comprehensive multi-tenant SaaS platform designed specifically for ferry companies. Manage your fleet, staff, routes, and bookings in one secure place.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Secure Isolation</h4>
                      <p className="text-sm text-muted-foreground">Your data is yours alone, strictly siloed from other operators.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Ticket className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Smart Ticketing</h4>
                      <p className="text-sm text-muted-foreground">Manage fares, waitlists, and real-time seat availability.</p>
                    </div>
                  </div>
                </div>
                <Button asChild size="lg" className="mt-8">
                  <Link href="/register-operator">Partner with Us</Link>
                </Button>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border bg-background">
                 <div className="p-8 flex flex-col h-full justify-center items-center text-center">
                    <Building2 className="h-16 w-16 text-primary/20 mb-4" />
                    <h3 className="text-xl font-bold">The Complete Operator Dashboard</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">Fleet Management, Passenger Manifests, Rebooking Tools, and Sales Reporting.</p>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ${className}`}>
      {children}
    </span>
  )
}
