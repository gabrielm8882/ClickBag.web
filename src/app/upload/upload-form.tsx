
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, UploadCloud, X, CheckCircle, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { handleImageUpload } from '@/lib/actions';
import type { ValidateReceiptImageOutput } from '@/ai/flows/validate-receipt-image';
import { useToast } from '@/hooks/use-toast';

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function UploadForm() {
  const [purchasePhoto, setPurchasePhoto] = useState<File | null>(null);
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [purchasePreview, setPurchasePreview] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateReceiptImageOutput | null>(null);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [spainTime, setSpainTime] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Request user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError("You denied the request for Geolocation. This is optional but helps with validation.");
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError("Location information is unavailable.");
              break;
            case error.TIMEOUT:
              setLocationError("The request to get user location timed out.");
              break;
            default:
              setLocationError("An unknown error occurred while getting your location.");
              break;
          }
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
    
    const getSpainTime = () => {
      const now = new Date();
      try {
        const timeString = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Madrid',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZoneName: 'short',
        }).format(now);
        setSpainTime(timeString);
        setIsTimeDialogOpen(true);
      } catch (e) {
        // Timezone not supported, do not show dialog
        console.error("Timezone 'Europe/Madrid' may not be supported in this environment.");
      }
    };
    getSpainTime();
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    previewSetter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
      previewSetter(URL.createObjectURL(file));
    }
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
    if (!purchasePhoto || !receiptPhoto) {
      setError('Please upload both a purchase photo and a receipt photo.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const purchasePhotoDataUri = await toDataURL(purchasePhoto);
      const receiptPhotoDataUri = await toDataURL(receiptPhoto);

      const aiResult = await handleImageUpload({
        purchasePhotoDataUri,
        receiptPhotoDataUri,
        userLatitude: userLocation?.latitude,
        userLongitude: userLocation?.longitude,
      });

      if (aiResult.error) {
        throw new Error(aiResult.error);
      }
      
      setResult(aiResult.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderFileUploader = (
    id: string,
    label: string,
    file: File | null,
    preview: string | null,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onClear: () => void,
    dataAiHint: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-semibold">{label}</Label>
      <Card className="p-4">
        {preview ? (
          <div className="relative group">
            <Image
              src={preview}
              alt={`${label} preview`}
              width={500}
              height={300}
              className="rounded-md object-cover w-full h-48"
              data-ai-hint={dataAiHint}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label htmlFor={id} className="cursor-pointer">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md hover:border-accent transition-colors">
              <UploadCloud className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Drag & drop or click to upload</p>
              <Input id={id} type="file" className="sr-only" onChange={onChange} accept="image/*" />
            </div>
          </label>
        )}
      </Card>
    </div>
  );

  return (
    <>
       <AlertDialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-accent"/>
            </div>
            <AlertDialogTitle className="text-center font-headline text-2xl">
              Current Time in Spain
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg font-mono pt-2">
              {spainTime}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsTimeDialogOpen(false)} className="w-full">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       
      {(userLocation || locationError) && (
        <Alert className="mb-8" variant={locationError ? "destructive" : "default"}>
          <MapPin className="h-4 w-4" />
          <AlertTitle>{locationError ? 'Location Access Denied' : 'Location Detected'}</AlertTitle>
          <AlertDescription>
            {locationError 
              ? locationError
              : `Your approximate location is being used to help with validation. (Lat: ${userLocation?.latitude.toFixed(4)}, Lon: ${userLocation?.longitude.toFixed(4)})`
            }
          </AlertDescription>
        </Alert>
      )}


      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {renderFileUploader('purchase-photo', 'Photo of Your Purchase', purchasePhoto, purchasePreview, (e) => handleFileChange(e, setPurchasePhoto, setPurchasePreview), () => { setPurchasePhoto(null); setPurchasePreview(null); }, 'product photo')}
          {renderFileUploader('receipt-photo', 'Photo of Your Receipt', receiptPhoto, receiptPreview, (e) => handleFileChange(e, setReceiptPhoto, setReceiptPreview), () => { setReceiptPhoto(null); setReceiptPreview(null); }, 'receipt photo')}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow" size="lg" disabled={isLoading || !purchasePhoto || !receiptPhoto}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            'Submit for Validation'
          )}
        </Button>
      </form>

      {result && (
        <AlertDialog open={!!result} onOpenChange={() => setResult(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex justify-center mb-4">
                 {result.isValid ? (
                    <CheckCircle className="h-16 w-16 text-green-500"/>
                  ) : (
                    <AlertTriangle className="h-16 w-16 text-destructive"/>
                  )}
              </div>
              <AlertDialogTitle className="text-center font-headline text-2xl">
                {result.isValid ? 'Validation Successful!' : 'Validation Failed'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {result.isValid
                  ? `Congratulations! You've earned ${result.clickPoints} ClickPoints.`
                  : 'There was an issue with your submission.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 space-y-4">
              <div>
                <p className="font-semibold text-sm">AI Analysis:</p>
                <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-md mt-1">{result.validationDetails}</p>
              </div>
              {result.geolocation && (
                 <div>
                    <p className="font-semibold text-sm">Purchase Location:</p>
                    <div className="text-sm text-muted-foreground p-3 bg-secondary rounded-md mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent"/>
                      <span>{result.geolocation}</span>
                    </div>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setResult(null)} className="w-full">
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    