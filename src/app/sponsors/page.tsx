
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeDollarSign, Leaf, Move3d, Recycle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function SponsorsPage() {
  const benefits = [
    {
      icon: <Leaf className="h-10 w-10 text-accent" />,
      title: 'Invest in nature',
      description: 'Align your brand with a powerful environmental mission. Every bag sponsored contributes directly to reforestation projects, showcasing your commitment to a greener planet.',
    },
    {
      icon: <Recycle className="h-10 w-10 text-accent" />,
      title: 'Sustainable advertising',
      description: 'Feature your brand on our reusable, recycled ClickBags. This replaces single-use bags and puts your logo on a product that consumers can feel good about using.',
    },
    {
      icon: <Move3d className="h-10 w-10 text-accent" />,
      title: 'A moving billboard',
      description: 'Our ClickBags travel everywhere with their users, from grocery stores to daily errands, turning every shopping trip into an advertising opportunity for your brand.',
    },
    {
      icon: <BadgeDollarSign className="h-10 w-10 text-accent" />,
      title: 'Pay-for-performance impact',
      description: 'Beyond sponsoring the bag itself, you fund a new tree every time a user validates a purchase with your branded bag. It\'s a direct, measurable return on your environmental investment.',
    },
  ];

  const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' } },
  };

  return (
    <div className="bg-secondary">
      <div className="container mx-auto px-4 md:px-6 py-20 md:py-24">
        {/* Header Section */}
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
          className="text-center"
        >
          <motion.h1
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-primary"
          >
            Partner with ClickBag
          </motion.h1>
          <motion.p
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="mx-auto max-w-[700px] text-muted-foreground md:text-xl mt-4"
          >
            Amplify your brand's message, reach a conscious audience, and make a tangible environmental impact.
          </motion.p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 mt-16"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={FADE_UP_ANIMATION_VARIANTS}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <Card className="text-center h-full shadow-lg hover:shadow-xl transition-shadow duration-300 border-none bg-background">
                <CardHeader>
                  <div className="mx-auto bg-accent/10 p-4 rounded-full w-fit">{benefit.icon}</div>
                  <CardTitle className="font-headline mt-4">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Call to Action */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={FADE_UP_ANIMATION_VARIANTS}
          className="mt-20 text-center"
        >
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Ready to become a sponsor?</h2>
             <p className="text-muted-foreground md:text-lg mt-2 mb-8 max-w-2xl mx-auto">
                Join us in our mission to turn everyday actions into a powerful force for good.
             </p>
             <p className="text-xl font-semibold">
                Contact us via Instagram DMs:{' '}
                <a
                  href="https://www.instagram.com/click_bag_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  @click_bag_
                </a>
            </p>
        </motion.div>

      </div>
    </div>
  );
}
