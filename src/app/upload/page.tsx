
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LeafLoader } from '@/components/ui/leaf-loader';
import UploadForm from './upload-form';

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
      <div className="text-center mb-12">
        <h1 className="font-headline text-3xl md:text-4xl font-bold">
          Validate Your Purchase
        </h1>
        <p className="text-muted-foreground mt-2 md:text-lg">
          Upload photos of your purchase and your receipt to earn ClickPoints.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
