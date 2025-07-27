
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LeafLoader } from '../ui/leaf-loader';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    // When a page transition starts, we set a timeout to end it.
    // This handles cases where the new page loads faster than the exit animation.
    if (isExiting) {
      // The duration should be slightly less than the animation exit time
      // to ensure the new page content is ready to be animated in.
      timer = setTimeout(() => setIsExiting(false), 250); 
    }
    return () => clearTimeout(timer);
  }, [isExiting]);

  useEffect(() => {
    // When the path changes, trigger the exit animation.
    // We don't want to trigger this on the initial load.
    const handleRouteChange = () => {
        setIsExiting(true);
    };

    // The 'useEffect' for route changes will run on initial load,
    // so we need a way to distinguish initial load from route changes.
    // A simple way is to check if the component has mounted before.
    const initialLoad = true;
    if(!initialLoad) {
        handleRouteChange();
    }
    
  }, [pathname]);

  return (
    <AnimatePresence mode="wait">
      {isExiting ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col justify-center items-center h-full min-h-[calc(100vh-11rem)]"
        >
          <LeafLoader />
        </motion.div>
      ) : (
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
