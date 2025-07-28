
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export interface UserData {
  totalPoints: number;
  totalTrees: number;
  displayName?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const processRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const userDocRef = doc(db, 'users', result.user.uid);
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              totalPoints: 0,
              totalTrees: 0,
              displayName: result.user.displayName,
              email: result.user.email,
            });
            sessionStorage.setItem('isNewUser', 'true');
            toast({
              title: "✅ Registration Successful",
              description: `Welcome to ClickBag, ${result.user.displayName}!`,
            });
          } else {
            toast({
              title: "✅ Login Successful",
              description: `Welcome back, ${result.user.displayName}!`,
            });
          }
          router.push('/dashboard');
        }
      } catch (error: any) {
         console.error("Error processing redirect result:", error);
         // Don't toast for "no-auth-event", which happens on every page load without a redirect.
         if (error.code !== 'auth/no-auth-event') {
            toast({
              variant: 'destructive',
              title: 'Authentication Error',
              description: 'Could not complete sign-in. Please try again.',
            });
         }
      }
    };

    // This is the main listener that ensures the app state is always in sync with Firebase's auth state.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          }
           // Once user and data are set, we can stop loading.
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        // Also stop loading if there's no user.
        setLoading(false);
      }
    });

    // We process the redirect first, then let the onAuthStateChanged listener take over.
    processRedirect();

    // Cleanup the listener on unmount
    return () => unsubscribe();
  }, []); // The empty dependency array ensures this runs only once on mount.


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // The redirect will cause the page to unload, so we don't need to handle success here.
      // The `useEffect` hook will handle the result when the user is redirected back.
      setLoading(true); // Set loading to true to show loader while redirecting
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: 'Could not start the sign-in process. Please try again.',
      });
      setLoading(false); // Reset loading state on error
    }
  };
  
  const signOut = async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will handle the user state update.
    router.push('/');
  };

  // The loading screen is crucial. It prevents the app from rendering the wrong state
  // while Firebase is initializing and checking the auth status.
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background">
        <LeafLoader />
        <p className="mt-4 text-muted-foreground">Initializing session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
