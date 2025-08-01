'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const FADE_UP_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export default function HeroSection() {
  return (
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
  );
}
