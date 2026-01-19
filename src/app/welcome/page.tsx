
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';

const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
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
      </main>
      <PublicFooter />
    </div>
  );
}
