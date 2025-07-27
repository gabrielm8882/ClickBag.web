
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
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
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (!userCredential.user.emailVerified) {
        toast({
          variant: 'destructive',
          title: 'Email not verified',
          description: 'Please check your inbox and verify your email address to log in.',
        });
        await auth.signOut(); // Ensure user is logged out
        return;
      }
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      // First, attempt to sign in with a popup.
      // This is a better user experience as it doesn't require a full page redirect.
      await signInWithPopup(auth, provider);
      toast({
        title: "Login successful",
        description: "Welcome!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      // The try...catch block is used to handle potential errors during the sign-in process.
      // If signInWithPopup fails, we can inspect the error and decide on a fallback action.
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // This specific error occurs when the popup is closed by the user or, more often,
        // blocked by the browser's security policies (e.g., popup blockers, cross-origin policies).
        // To ensure the user can still sign in, we fall back to signInWithRedirect.
        // This method navigates the user to the Google sign-in page and then redirects them back,
        // which is more robust against popup blockers.
        try {
          await signInWithRedirect(auth, provider);
          // No navigation or toast is needed here, as the page will redirect away and then
          // the AuthProvider will handle the successful sign-in when the user returns.
        } catch (redirectError: any) {
           toast({
            variant: 'destructive',
            title: 'Google sign-in failed',
            description: redirectError.message,
          });
        }
      } else {
         // Handle other potential errors, such as network issues or problems with the Google account.
        toast({
          variant: 'destructive',
          title: 'Google sign-in failed',
          description: error.message,
        });
      }
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
            <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
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
