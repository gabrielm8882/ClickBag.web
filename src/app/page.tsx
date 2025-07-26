
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, ScanLine, Coins, ArrowRight, Info, User, Zap, Package, Handshake, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface CommunityStats {
    totalTreesPlanted: number;
    totalClickPoints: number;
}


export default function Home() {
  const { user } = useAuth();
  const [communityStats, setCommunityStats] = useState<CommunityStats>({ totalTreesPlanted: 0, totalClickPoints: 0 });

  useEffect(() => {
    const statsDocRef = doc(db, 'community-stats', 'global');
    const unsubscribe = onSnapshot(statsDocRef, (doc) => {
      if (doc.exists()) {
        setCommunityStats(doc.data() as CommunityStats);
      }
    });

    return () => unsubscribe();
  }, []);

  const features = [
    {
      icon: <Package className="h-10 w-10 text-accent" />,
      title: 'Get your ClickBag',
      description: 'Receive your FREE bag via package, by following us on Instagram (@click_bag_), or get it on the street. Sponsored messages on the bag fund tree planting at no cost to you.',
    },
    {
      icon: <ScanLine className="h-10 w-10 text-accent" />,
      title: 'Scan & upload',
      description: 'Use your phone to scan the QR code on your ClickBag, then upload photos of your receipt and purchase.',
    },
    {
      icon: <Coins className="h-10 w-10 text-accent" />,
      title: 'Earn ClickPoints',
      description: 'Our AI validates your submission, awarding you ClickPoints for every sustainable choice you make.',
    },
    {
      icon: <Leaf className="h-10 w-10 text-accent" />,
      title: 'Plant trees',
      description: 'Your accumulated ClickPoints contribute directly to tree planting projects around the world.',
    },
  ];

  const isTreesLocked = communityStats.totalTreesPlanted < 100;
  const isPointsLocked = communityStats.totalClickPoints < 1000;
  
  const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' } },
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-24 bg-secondary">
        <motion.div
          initial="hidden"
          animate="show"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          className="container mx-auto px-4 md:px-6 text-center"
        >
          <motion.h1
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="font-headline text-4xl md:text-6xl font-bold tracking-tighter text-primary"
          >
            Turn your{' '}
            <span className="font-cursive text-[2.5rem] md:text-[4.3rem] text-accent [text-shadow:0_0_8px_hsl(var(--accent))] italic">
              purchases
            </span>{' '}
            into planted{' '}
            <span className="font-cursive text-[2.5rem] md:text-[4.3rem] text-accent [text-shadow:0_0_8px_hsl(var(--accent))] italic">
              trees
            </span>
          </motion.h1>
          <motion.p
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="mx-auto max-w-[700px] text-muted-foreground md:text-xl mt-4"
          >
            What if you could reforest the earth without spending time, laying a dime or moving a muscle?
          </motion.p>
          <motion.div
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="mt-8"
          >
            <Link href="/register">
              <Button size="lg" className="shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow">
                Get started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="text-center"
          >
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Simple steps to a greener world</h2>
            <p className="text-muted-foreground md:text-lg mt-2">Making an impact has never been easier.</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
                hidden: {},
                show: {
                transition: {
                    staggerChildren: 0.15,
                },
                },
            }}
            className="grid gap-8 md:grid-cols-1 lg:grid-cols-4 mt-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={FADE_UP_ANIMATION_VARIANTS}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <Card className="text-center h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto bg-accent/10 p-4 rounded-full w-fit">{feature.icon}</div>
                    <CardTitle className="font-headline mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission and Sponsors Section */}
      <section className="w-full py-16 md:py-20">
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="container mx-auto px-4 md:px-6"
        >
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Our mission & our sponsors</h2>
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
        </motion.div>
      </section>
      
      {/* Aggregate Progress Display */}
      <section className="w-full py-16 md:py-24 bg-secondary">
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="container mx-auto px-4 md:px-6 text-center"
        >
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Our collective impact</h2>
            <p className="text-muted-foreground md:text-lg mt-2 mb-8">
              See what our community has achieved together.
            </p>
            <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                    hidden: {},
                    show: {
                        transition: {
                            staggerChildren: 0.15,
                        },
                    },
                }}
                className="grid gap-8 md:grid-cols-2"
            >
                <motion.div variants={FADE_UP_ANIMATION_VARIANTS}>
                    <Card className="p-8 shadow-lg">
                        <Leaf className="h-12 w-12 text-accent mx-auto mb-4" />
                        <h3 className="font-headline text-2xl font-semibold mb-2">Trees planted</h3>
                        <div className="relative h-[72px] flex items-center justify-center">
                          {isTreesLocked ? (
                            <TooltipProvider>
                               <Tooltip>
                                <TooltipTrigger>
                                  <motion.div whileHover={{ scale: 1.1, rotate: [-5, 5, -2, 2, 0] }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
                                    <Lock className="h-10 w-10 text-accent [filter:drop-shadow(0_0_6px_hsl(var(--accent)))]"/>
                                  </motion.div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This will be unlocked once the community plants 100 trees.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                             <AnimatedCounter end={communityStats.totalTreesPlanted} className="font-headline text-5xl md:text-7xl font-bold text-primary" />
                          )}
                        </div>
                    </Card>
                </motion.div>
                <motion.div variants={FADE_UP_ANIMATION_VARIANTS}>
                    <Card className="p-8 shadow-lg">
                        <Coins className="h-12 w-12 text-accent mx-auto mb-4" />
                        <h3 className="font-headline text-2xl font-semibold mb-2">Total ClickPoints earned</h3>
                        <div className="relative h-[72px] flex items-center justify-center">
                           {isPointsLocked ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                   <motion.div whileHover={{ scale: 1.1, rotate: [-5, 5, -2, 2, 0] }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
                                    <Lock className="h-10 w-10 text-accent [filter:drop-shadow(0_0_6px_hsl(var(--accent)))]"/>
                                  </motion.div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This will be unlocked once the community earns 1,000 ClickPoints.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                             <AnimatedCounter end={communityStats.totalClickPoints} className="font-headline text-5xl md:text-7xl font-bold text-primary" />
                          )}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        </motion.div>
      </section>

      {/* Join Project Section */}
      <section className="w-full py-16">
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="container mx-auto px-4 md:px-6 text-center"
        >
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Ready to make an impact?</h2>
          <p className="text-muted-foreground md:text-lg mt-2 mb-8">
            Become a part of the ClickBag community and start turning your actions into a greener planet.
          </p>
          <Link href="/register">
            <Button size="lg" className="shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow">
              Join our project now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Sponsors Section */}
      <section id="sponsors" className="w-full py-16 md:py-20 bg-secondary">
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="container mx-auto px-4 md:px-6 text-center"
        >
          <Handshake className="h-12 w-12 text-accent mx-auto mb-4" />
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Are you a sponsor?</h2>
          <p className="text-muted-foreground md:text-lg mt-2 mb-8 max-w-2xl mx-auto">
            Help us grow our impact. Sponsoring ClickBags is an investment in nature and a unique way to advertise your brand on a sustainable product.
          </p>
          <div className="flex flex-col items-center gap-4">
             <Link href="/sponsors">
                <Button size="lg" className="shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow">
                    What's in for you?
                </Button>
            </Link>
            <p className="text-lg font-semibold">
              Or, DM us on Instagram:{' '}
              <a
                href="https://www.instagram.com/click_bag_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                @click_bag_
              </a>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
