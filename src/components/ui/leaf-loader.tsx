"use client";

import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeafLoader({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex justify-center items-center h-16 w-16", className)}>
      <motion.div
        style={{
          originX: '50%',
          originY: '50%',
        }}
        animate={{
          y: [-10, 10, -10],
          rotate: [0, 15, -15, 15, 0],
          x: [0, 5, -5, 5, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Leaf className="h-12 w-12 text-accent [filter:drop-shadow(0_0_8px_hsl(var(--accent)))]" />
      </motion.div>
    </div>
  );
}
