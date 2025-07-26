
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LeafLoader } from '@/components/ui/leaf-loader';
import UploadForm from './upload-form';
import { Camera, ShoppingBag, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <LeafLoader />
        <p className="mt-4 text-muted-foreground">Loading uploader...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4 md:px-6">
      <div className="text-center mb-8">
        <h1 className="font-headline text-3xl md:text-4xl font-bold">
          Validate Your Purchase
        </h1>
        <p className="text-muted-foreground mt-2 md:text-lg">
          Take one clear photo with the required items to earn ClickPoints.
        </p>
      </div>

       <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
       >
        <Card className="mb-8 bg-secondary/30">
            <CardContent className="p-6">
                <h3 className="font-headline text-lg font-semibold mb-4 text-center">Key Requirements</h3>
                <div className="flex flex-col md:flex-row justify-around items-center gap-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <div className="bg-accent/10 p-3 rounded-full">
                           <ShoppingBag className="h-8 w-8 text-accent" />
                        </div>
                        <span className="text-sm text-muted-foreground">Your shopping bag</span>
                    </div>
                    <div className="text-2xl font-semibold text-muted-foreground">+</div>
                     <div className="flex flex-col items-center gap-2">
                        <div className="bg-accent/10 p-3 rounded-full">
                           <Receipt className="h-8 w-8 text-accent" />
                        </div>
                        <span className="text-sm text-muted-foreground">The paper receipt</span>
                    </div>
                    <div className="text-2xl font-semibold text-muted-foreground hidden md:block">=</div>
                    <div className="flex flex-col items-center gap-2 mt-4 md:mt-0">
                       <div className="bg-green-500/10 p-3 rounded-full">
                           <Camera className="h-8 w-8 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-green-700">One single photo</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </motion.div>

      <UploadForm />
    </div>
  );
}
