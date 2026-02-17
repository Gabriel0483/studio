
'use client';

import Link from 'next/link';
import { useTenant } from '@/components/dashboard/tenant-context';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { Ship, Ticket, Clock, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OperatorHomePage() {
  const { tenantName, tenantId } = useTenant();

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

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary py-24 text-primary-foreground md:py-32">
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white/20 p-4 rounded-full">
                <Ship className="h-12 w-12" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Welcome to {tenantName}
              </h1>
              <p className="max-w-2xl text-lg opacity-90 md:text-xl">
                Providing safe, reliable, and comfortable sea travel. Book your next journey with us today.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row pt-4">
                <Button asChild size="lg" variant="secondary">
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
                <Card key={feature.title} className="flex flex-col h-full hover:shadow-md transition-shadow">
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
