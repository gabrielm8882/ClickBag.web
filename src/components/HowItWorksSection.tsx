'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, ScanLine, Coins, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const FADE_UP_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export default function HowItWorksSection() {
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

  return (
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
  );
}
