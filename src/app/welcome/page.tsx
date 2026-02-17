
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { Ship, Building2, Ticket, ShieldCheck, MapPin, Clock, BarChart3, Users } from 'lucide-react';

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
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-4xl">
                The Unified Platform for <span className="text-primary">Maritime Excellence</span>
              </h1>
              <p className="max-w-3xl text-lg text-muted-foreground md:text-xl">
                Isla Konek connects passengers with modern ferry operators through a secure, real-time ecosystem. Book your tickets in minutes or digitalize your entire shipping operation today.
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

        {/* Core Pillars */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">One Platform, Endless Connections</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">We provide the infrastructure that keeps the islands moving, supporting both everyday travelers and professional operators.</p>
            </div>
            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-4">
                <div className="bg-primary/10 p-3 rounded-lg w-fit">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Smart Ticketing</h3>
                <p className="text-sm text-muted-foreground">Effortless online booking with real-time seat availability, dynamic fares, and instant e-itineraries.</p>
              </div>
              <div className="space-y-4">
                <div className="bg-primary/10 p-3 rounded-lg w-fit">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Live Fleet Status</h3>
                <p className="text-sm text-muted-foreground">Passengers stay informed with up-to-the-minute departure and arrival updates directly from port dispatchers.</p>
              </div>
              <div className="space-y-4">
                <div className="bg-primary/10 p-3 rounded-lg w-fit">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Route Management</h3>
                <p className="text-sm text-muted-foreground">Operators can define complex transit networks across multiple ports with full control over distances and schedules.</p>
              </div>
              <div className="space-y-4">
                <div className="bg-primary/10 p-3 rounded-lg w-fit">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Operations Insights</h3>
                <p className="text-sm text-muted-foreground">Comprehensive reporting tools for sales, passenger volume, and fleet performance to drive data-backed decisions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* For Operators Section */}
        <section className="w-full py-24 bg-muted/30 border-y">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge className="mb-4">Enterprise SaaS</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Digitalize Your Entire Shipping Company</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Isla Konek is a comprehensive multi-tenant platform designed specifically for the maritime sector. Manage your fleet, staff, and passengers in a secure, siloed environment.
                </p>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Secure Isolation</h4>
                      <p className="text-sm text-muted-foreground">Your operational data is strictly siloed from other tenants on the platform.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Role-Based Access</h4>
                      <p className="text-sm text-muted-foreground">Assign specific permissions to Station Managers, Crew, and Desk Agents.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-10 flex items-center gap-4">
                  <Button asChild size="lg">
                    <Link href="/register-operator">Become a Partner</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/admin/login">Operator Login →</Link>
                  </Button>
                </div>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border-8 border-background bg-card">
                 <div className="p-12 flex flex-col h-full justify-center items-center text-center">
                    <div className="bg-primary/5 p-6 rounded-full mb-6">
                      <Building2 className="h-16 w-16 text-primary/40" />
                    </div>
                    <h3 className="text-2xl font-bold">Operator Command Center</h3>
                    <p className="text-muted-foreground max-w-sm mt-4">
                      Real-time manifests, fleet tracking, maintenance logs, and financial reconciliation in one integrated dashboard.
                    </p>
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
    <span className={`inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary tracking-wider uppercase ${className}`}>
      {children}
    </span>
  )
}
