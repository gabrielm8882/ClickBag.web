
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect if the app is running in an iframe (e.g., Firebase Studio preview)
    if (window.self !== window.top) {
      setIsInIframe(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);


  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "✅ Login Successful",
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      let description = "An unknown error occurred.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Invalid email or password. Please try again.";
      }
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isInIframe) return; // Prevent action if in iframe

    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // The useAuth hook will handle the redirect upon successful sign-in
    } catch (error: any) {
      let description = "An unknown error occurred during sign-in.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "The sign-in popup was closed before completing. Please try again.";
      }
      toast({
          variant: 'destructive',
          title: 'Google Sign-In Failed',
          description: description,
      });
    } finally {
        setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account.
        </CardDescription>
      </CardHeader>
      
      {isInIframe && (
        <div className="px-6 pb-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Preview Environment</AlertTitle>
            <AlertDescription>
              Google Sign-In is disabled in the preview. Please open the app in a new tab to use this feature.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="grid gap-4">
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
              {isLoading ? <Loader2 className="animate-spin" /> : 'Sign in'}
            </Button>
            <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isInIframe}>
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : 'Sign in with Google'}
            </Button>
            <div className="mt-4 text-center text-sm w-full">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="underline text-accent-foreground hover:text-accent">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
