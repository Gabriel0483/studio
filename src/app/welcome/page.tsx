'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Ticket, ClipboardCheck, LayoutDashboard, Settings2, Receipt, BarChart3, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const defaultHero = PlaceHolderImages.find((img) => img.id === 'hero-image');

export default function WelcomePage() {
  const firestore = useFirestore();
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'settings') : null), [firestore]);
  const { data: config } = useDoc(configRef);

  const displayTitle = config?.heroTitle || 'Smooth Sailing with Isla Konek';
  const displayDescription = config?.heroDescription || 'The unified platform for reliable maritime travel. Book your next journey with us today.';
  const displayHeroImage = config?.heroImageUrl || defaultHero?.imageUrl;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative w-full pt-24 pb-12 md:pt-40 md:pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
           <div className="absolute inset-0 -z-10">
            {displayHeroImage && (
              <Image
                src={displayHeroImage}
                alt="Ferry"
                fill
                className="object-cover"
                data-ai-hint="ferry ship"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="flex flex-col items-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-4xl">
                {displayTitle}
              </h1>
              <p className="max-w-3xl text-lg text-muted-foreground md:text-xl">
                {displayDescription}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="px-8">
                  <Link href="/book">Book a Trip Now</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-8">
                   <Link href="/status">Live Trip Status</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-card">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Services</Badge>
              <h2 className="text-3xl font-bold tracking-tight">Your Sea Travel Companion</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard icon={Ticket} title="Smart Ticketing" description="Secure online booking for individuals and families." />
              <FeatureCard icon={Clock} title="Live Status" description="Real-time departure and arrival updates." />
              <FeatureCard icon={MapPin} title="Route Map" description="Explore our entire operational network." />
              <FeatureCard icon={ClipboardCheck} title="Boarding Manifest" description="Efficient digital check-in for all passengers." />
              <FeatureCard icon={Settings2} title="Self-Service" description="Manage your profile and bookings with ease." />
              <FeatureCard icon={ShieldCheck} title="Safe & Secure" description="Enterprise-grade security for your data and travels." />
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl border bg-background hover:shadow-md transition-all text-center flex flex-col items-center">
      <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}