
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, AlertTriangle, Video, VideoOff, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCapturing(false);
    }
  }, [stream]);

  const startCamera = async () => {
    if (stream) {
      stopCamera();
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      setStream(newStream);
      setIsCapturing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
      stopCamera();
    }
  };

  useEffect(() => {
    // Clean up the stream when the component unmounts
    return () => {
      stopCamera();
    };
  }, [stopCamera]);
  
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame onto the canvas
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Convert canvas to a blob, then to a file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
        onCapture(file);
      }
    }, 'image/png');
    
    // Stop the camera after taking the picture
    stopCamera();
  };

  if (hasCameraPermission === false) {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Camera Permission Denied</AlertTitle>
            <AlertDescription>
                Please enable camera access in your browser settings to use this feature.
                <Button variant="link" onClick={startCamera} className="p-0 h-auto ml-1">Try again?</Button>
            </AlertDescription>
        </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className={cn("relative w-full aspect-video bg-secondary rounded-md overflow-hidden flex items-center justify-center", { 'border-2 border-dashed': !isCapturing })}>
        <video ref={videoRef} className={cn("w-full h-full object-cover", { 'hidden': !isCapturing })} autoPlay muted playsInline />
        {!isCapturing && (
          <div className="text-center text-muted-foreground p-4">
            <VideoOff className="mx-auto h-12 w-12 mb-2" />
            <p>Camera is off</p>
          </div>
        )}
        {isCapturing && (
            <div className="absolute inset-0 border-[10px] border-black/20 rounded-md"></div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        {!isCapturing ? (
            <Button type="button" onClick={startCamera} className="w-full">
                <Video className="mr-2" /> Start Camera
            </Button>
        ) : (
            <>
                <Button type="button" variant="outline" onClick={stopCamera} className="w-full">
                    <VideoOff className="mr-2" /> Stop
                </Button>
                <Button type="button" onClick={handleCapture} className="w-full">
                    <Camera className="mr-2" /> Capture
                </Button>
            </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
