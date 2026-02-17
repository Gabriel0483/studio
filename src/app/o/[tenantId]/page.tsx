
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTenant } from '@/components/dashboard/tenant-context';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { Ship, Ticket, Clock, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OperatorHomePage() {
  const { tenantName, tenantId, heroTitle, heroDescription, heroImageUrl } = useTenant();

  const features = [
    {
      title: 'Online Booking',
      description: 'Reserve your seats in advance and pay conveniently.',
      icon: Ticket,
      href: `/o/${tenantId}/book`,
      action: 'Book Now',
    },
    {
      title: 'Live Trip Status',
      description: 'Check real-time updates on departures and arrivals.',
      icon: Clock,
      href: `/o/${tenantId}/status`,
      action: 'Check Status',
    },
    {
      title: 'Public Advisories',
      description: 'Stay informed about service disruptions or schedule changes.',
      icon: Megaphone,
      href: `/o/${tenantId}/advisories`,
      action: 'View Advisories',
    },
  ];

  // Default values if operator hasn't customized
  const displayTitle = heroTitle || `Welcome to ${tenantName}`;
  const displayDescription = heroDescription || 'Providing safe, reliable, and comfortable sea travel. Book your next journey with us today.';
  const displayHeroImage = heroImageUrl || 'https://images.unsplash.com/photo-1688680292475-220aaf8685d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxmZXJyeSUyMHNlYXxlbnwwfHx8fDE3NjY3Njk1NTd8MA&ixlib=rb-4.1.0&q=80&w=1080';

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero Section with Custom Branding */}
        <section className="relative py-24 text-primary-foreground md:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <Image
              src={displayHeroImage}
              alt={tenantName || 'Ferry'}
              fill
              className="object-cover"
              data-ai-hint="ferry ship"
            />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          </div>
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
                <Ship className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                {displayTitle}
              </h1>
              <p className="max-w-2xl text-lg opacity-90 md:text-xl">
                {displayDescription}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row pt-4">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link href={`/o/${tenantId}/book`}>Book a Trip</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  <Link href={`/o/${tenantId}/status`}>Live Schedule</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="flex flex-col h-full hover:shadow-md transition-all">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button asChild variant="ghost" className="w-full justify-start p-0 text-primary hover:bg-transparent hover:underline">
                      <Link href={feature.href}>{feature.action} →</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
