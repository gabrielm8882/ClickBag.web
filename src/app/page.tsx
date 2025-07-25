'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, ScanLine, Coins, ArrowRight, Info, User, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

function AnimatedCounter({ end, duration = 2000, className }: { end: number; duration?: number, className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const current = Math.min(Math.floor((progress / duration) * end), end);
      setCount(current);
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span className={className}>{count.toLocaleString()}</span>;
}

export default function Home() {
  const features = [
    {
      icon: <ScanLine className="h-10 w-10 text-accent" />,
      title: 'Scan & Upload',
      description: 'Use your phone to scan the QR code on your ClickBag, then upload photos of your receipt and purchase.',
    },
    {
      icon: <Coins className="h-10 w-10 text-accent" />,
      title: 'Earn ClickPoints',
      description: 'Our AI validates your submission, awarding you ClickPoints for every sustainable choice you make.',
    },
    {
      icon: <Leaf className="h-10 w-10 text-accent" />,
      title: 'Plant Trees',
      description: 'Your accumulated ClickPoints contribute directly to tree planting projects around the world.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 bg-secondary">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter text-primary">
            Turn your{' '}
            <span className="font-cursive text-[2.4rem] md:text-[3.8rem] text-accent [text-shadow:0_0_8px_hsl(var(--accent))] italic mr-1">
              purchases
            </span>{' '}
            into planted{' '}
            <span className="font-cursive text-[2.4rem] md:text-[3.8rem] text-accent [text-shadow:0_0_8px_hsl(var(--accent))] italic">
              trees
            </span>
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl mt-4">
            Join ClickBag and make a difference with every purchase. Use our sponsored bags, earn points, and help us
            reforest the planet.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" className="shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-20 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center">
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Simple Steps to a Greener World</h2>
            <p className="text-muted-foreground md:text-lg mt-2">Making an impact has never been easier.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 mt-12">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto bg-accent/10 p-4 rounded-full w-fit">{feature.icon}</div>
                  <CardTitle className="font-headline mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission and Sponsors Section */}
      <section className="w-full py-20 md:py-24">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 px-4 md:px-6 items-center">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Our Mission & Our Sponsors</h2>
            <p className="text-muted-foreground mt-4">
              At ClickBag, we believe that small actions can lead to massive change. Our mission is to transform
              everyday purchases into a force for environmental good. We replace single-use bags with our reusable
              ClickBags, funded by conscious sponsors.
            </p>
            <p className="text-muted-foreground mt-4">
              Our sponsors advertise on these bags, enabling us to provide them for free and fund vital tree-planting
              initiatives. It's a win-win-win: you get a free reusable bag, sponsors reach a conscious audience, and
              together, we heal the planet.
            </p>
            <div className="mt-6 space-y-4">
                <div className="flex items-start gap-4">
                    <Info className="h-6 w-6 text-accent mt-1 shrink-0"/>
                    <p className="text-muted-foreground">Every second, 160,000 plastic bags are used around the world. Your choice to use a ClickBag matters.</p>
                </div>
                <div className="flex items-start gap-4">
                    <Zap className="h-6 w-6 text-accent mt-1 shrink-0"/>
                    <p className="text-muted-foreground">It's a one-time setup. Once you're in, you can contribute effortlessly forever without hassle.</p>
                </div>
                <div className="flex items-start gap-4">
                    <User className="h-6 w-6 text-accent mt-1 shrink-0"/>
                    <p className="text-muted-foreground">This project was built by a 16-year-old from Spain with a passion for our planet.</p>
                </div>
            </div>
          </div>
          <div>
            <Image
              src="https://placehold.co/600x400.png"
              alt="Sponsored ClickBag"
              width={600}
              height={400}
              className="rounded-lg shadow-lg"
              data-ai-hint="shopping bag"
            />
          </div>
        </div>
      </section>
      
      {/* Aggregate Progress Display */}
      <section className="w-full py-20 md:py-32 bg-secondary">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Our Collective Impact</h2>
            <p className="text-muted-foreground md:text-lg mt-2 mb-8">
              See what our community has achieved together.
            </p>
            <div className="grid gap-8 md:grid-cols-2">
                <Card className="p-8 shadow-lg">
                    <Leaf className="h-12 w-12 text-accent mx-auto mb-4" />
                    <h3 className="font-headline text-2xl font-semibold mb-2">Trees Planted</h3>
                    <AnimatedCounter end={0} className="font-headline text-5xl md:text-7xl font-bold text-primary blur-lg" />
                </Card>
                <Card className="p-8 shadow-lg">
                    <Coins className="h-12 w-12 text-accent mx-auto mb-4" />
                    <h3 className="font-headline text-2xl font-semibold mb-2">Total ClickPoints Earned</h3>
                    <AnimatedCounter end={0} className="font-headline text-5xl md:text-7xl font-bold text-primary blur-lg" />
                </Card>
            </div>
        </div>
      </section>

      {/* Join Project Section */}
      <section className="w-full py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Ready to Make an Impact?</h2>
          <p className="text-muted-foreground md:text-lg mt-2 mb-8">
            Become a part of the ClickBag community and start turning your actions into a greener planet.
          </p>
          <Link href="/register">
            <Button size="lg" className="shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow">
              Join our project now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
