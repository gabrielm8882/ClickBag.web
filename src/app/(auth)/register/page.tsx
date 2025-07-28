
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    // Detect if the app is running in an iframe (e.g., Firebase Studio preview)
    if (typeof window !== 'undefined' && window.self !== window.top) {
      setIsIframe(true);
    }
  }, []);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.name });

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, { totalPoints: 0, totalTrees: 0 });
      
      await sendEmailVerification(userCredential.user);
      
      toast({
        title: "Verification email sent",
        description: "Please check your inbox to verify your account.",
      });

      router.push('/verify-email');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Use signInWithPopup for a more direct login flow that avoids redirect issues.
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);

      // If the user is new, create a document for them in Firestore.
      if (additionalInfo?.isNewUser) {
        const userDocRef = doc(db, 'users', result.user.uid);
        await setDoc(userDocRef, { totalPoints: 0, totalTrees: 0 });
        toast({
          title: "✅ Registration Complete",
          description: `Welcome to ClickBag, ${result.user.displayName}!`,
        });
        sessionStorage.setItem('isNewUser', 'true');
      } else {
        toast({
            title: "✅ Login Successful",
            description: `Welcome back, ${result.user.displayName}!`,
        });
      }

      router.push('/dashboard');
    } catch (error: any) {
      let description = "An unknown error occurred.";
      // Provide clearer error messages for common popup-related issues.
      if (error.code === 'auth/popup-closed-by-user') {
        description = "The sign-up popup was closed before completing the process. Please try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        description = "Multiple sign-up popups were opened. Please try again."
      } else {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Google Sign-up failed',
        description: description,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (isIframe) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Preview Mode</CardTitle>
          <CardDescription>
            Authentication needs to be tested in a separate window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Notice</AlertTitle>
            <AlertDescription>
              To test Google Sign-Up, please open the application in a new browser tab. Popups are restricted within this preview iframe.
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.open(window.location.href, '_blank')} className="w-full mt-4">
            Open in New Tab
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Register</CardTitle>
        <CardDescription>
          Create an account to start turning your purchases into trees.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Max Robinson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-shadow" disabled={isLoading || isGoogleLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create account'}
            </Button>
             <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : 'Sign up with Google'}
            </Button>
            <div className="mt-4 text-center text-sm w-full">
              Already have an account?{' '}
              <Link href="/login" className="underline text-accent-foreground hover:text-accent">
                Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
