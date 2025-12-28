import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Bot, Ship, Users, BarChart } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { RouteSelection } from '@/components/route-selection';

const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');

const features = [
  {
    icon: <Bot className="h-10 w-10 text-primary" />,
    title: 'Automated Scheduling',
    description: 'AI-powered creation of optimized routes considering passenger numbers, ship availability, and timing.',
  },
  {
    icon: <Ship className="h-10 w-10 text-primary" />,
    title: 'Operational Management',
    description: 'Handle ship maintenance schedules, staffing, and daily operations with ease.',
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: 'Passenger Management',
    description: 'A user-friendly interface for passengers to book seats and for you to manage their journey.',
  },
  {
    icon: <BarChart className="h-10 w-10 text-primary" />,
    title: 'Real-Time Analytics',
    description: 'Monitor operations, track passenger data, and generate insightful reports in real-time.',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
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
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
          </div>
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col justify-center space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  Streamline Your Shipping Operations with Isla Konek
                </h1>
                <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
                  From passenger reservations to daily operations, our all-in-one web application automates the entire process, saving you time, money, and headaches.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <Card className="w-full max-w-md shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">Find Your Ferry</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RouteSelection />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full bg-secondary py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">A Win-Win For Everyone</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Our solution combines enterprise-level operational management with a consumer-facing reservation system, built for modern shipping companies.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      {feature.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
                  </CardContent>
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
