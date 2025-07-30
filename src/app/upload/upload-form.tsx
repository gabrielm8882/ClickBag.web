
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, UploadCloud, X, CheckCircle, AlertTriangle, MapPin, Camera, Sparkles, Wand } from 'lucide-react';
import { handleImageUpload } from '@/lib/actions';
import type { ValidateReceiptImageOutput } from '@/ai/flows/validate-receipt-image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CameraCapture } from '@/components/camera-capture';
import { motion, AnimatePresence } from 'framer-motion';

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function UploadForm() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateReceiptImageOutput | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'warning' | 'error'>('loading');
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationStatus('success');
          setLocationError(null);
        },
        (error) => {
          let message = "Could not get location. You can still submit, but including location improves validation accuracy.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied. You can still submit, but including location is recommended.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information is unavailable. You can still proceed with your submission.";
              break;
            case error.TIMEOUT:
              message = "Request for location timed out. You may continue without it.";
              break;
          }
          setLocationError(message);
          setLocationStatus('warning');
        }, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser. You can still submit your photo.");
      setLocationStatus('warning');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCapture = (file: File) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };


  const toDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) {
      setError('Please provide a photo.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const photoDataUri = await toDataURL(photo);

      const aiResult = await handleImageUpload({
        photoDataUri,
        userLatitude: userLocation?.latitude,
        userLongitude: userLocation?.longitude,
      });
      
      setResult(aiResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
       <Card className="mb-8 overflow-hidden shadow-sm">
        <CardContent className="p-4 bg-secondary/30">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Alert className={cn({
                    "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300": locationStatus === 'loading',
                    "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300": locationStatus === 'success',
                    "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300": locationStatus === 'warning',
                    "border-destructive/50 text-destructive": locationStatus === 'error', // Should not happen now
                })}>
                  <MapPin className={cn("h-4 w-4", {
                      "animate-pulse": locationStatus === 'loading',
                  })} />
                  <AlertTitle>
                      {locationStatus === 'loading' && 'Fetching Location...'}
                      {locationStatus === 'success' && 'Location Acquired'}
                      {locationStatus === 'warning' && 'Location Recommended'}
                  </AlertTitle>
                  <AlertDescription>
                    {locationStatus === 'loading' && 'Accessing your location to improve validation accuracy. Please wait...'}
                    {locationStatus === 'success' && 'Location captured successfully. For best results, submit your photo near the store.'}
                    {locationStatus === 'warning' && locationError}
                  </AlertDescription>
                </Alert>
            </motion.div>
        </CardContent>
       </Card>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-8"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="space-y-2">
          <Card className="p-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group"
                >
                  <Image
                    src={preview}
                    alt={`Photo preview`}
                    width={500}
                    height={300}
                    className="rounded-md object-cover w-full h-64"
                    data-ai-hint="receipt bag purchase"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setPhoto(null); setPreview(null); }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="uploader"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Tabs defaultValue="camera" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="camera"><Camera className="mr-2" />Use Camera</TabsTrigger>
                      <TabsTrigger value="upload"><UploadCloud className="mr-2" />Upload File</TabsTrigger>
                    </TabsList>
                    <TabsContent value="camera">
                        <div className="mt-4">
                          <CameraCapture onCapture={handleCapture} />
                        </div>
                    </TabsContent>
                    <TabsContent value="upload">
                      <label htmlFor={`photo-upload`} className="cursor-pointer">
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md hover:border-accent transition-colors mt-4">
                          <UploadCloud className="h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">Drag & drop or click to upload</p>
                          <Input id={`photo-upload`} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                        </div>
                      </label>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow" size="lg" disabled={isLoading || !photo}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2" />
              Submit for validation
            </>
          )}
        </Button>
      </motion.form>

      {result && (
        <AlertDialog open={!!result} onOpenChange={() => setResult(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="flex justify-center mb-4"
              >
                 {result.isValid ? (
                    <CheckCircle className="h-16 w-16 text-green-500"/>
                  ) : (
                    <AlertTriangle className="h-16 w-16 text-destructive"/>
                  )}
              </motion.div>
              <AlertDialogTitle className="text-center font-headline text-2xl">
                {result.isValid ? 'Validation successful!' : 'Validation failed'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {result.isValid
                  ? `Congratulations! You've earned ${result.clickPoints} ClickPoints.`
                  : 'There was an issue with your submission.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 space-y-4">
              <div>
                <p className="font-semibold text-sm flex items-center gap-2"><Wand className="h-4 w-4 text-accent" /> AI analysis:</p>
                <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-md mt-1">{result.validationDetails}</p>
              </div>
              {result.geolocation && (
                 <div>
                    <p className="font-semibold text-sm">Purchase location:</p>
                    <div className="text-sm text-muted-foreground p-3 bg-secondary rounded-md mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent"/>
                      <span>{result.geolocation}</span>
                    </div>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setResult(null);
                setPhoto(null);
                setPreview(null);
              }} className="w-full">
                Done
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
