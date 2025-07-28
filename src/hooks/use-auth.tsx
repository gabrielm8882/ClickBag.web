
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
    // This is the core logic. It runs only once on mount.
    // It checks for a redirect result AND sets up the auth state listener.
    const processAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User has just signed in via redirect.
          const userDocRef = doc(db, 'users', result.user.uid);
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            // This is a new user registration.
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
            // This is an existing user login.
             toast({
              title: "✅ Login Successful",
              description: `Welcome back, ${result.user.displayName}!`,
            });
          }
          // No need to call setLoading(false) here, onAuthStateChanged will handle it.
        }
      } catch (error: any) {
        console.error("Error processing redirect result:", error);
        // Avoid showing an error for "no-auth-event" which happens on every normal page load.
        if (error.code !== 'auth/no-auth-event') {
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not complete sign-in. Please try again.',
          });
        }
      }

      // After processing a potential redirect, set up the permanent listener.
      // This listener will keep the user state in sync for the entire session.
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user);
          // Set up a real-time listener for user data
          const userDocRef = doc(db, 'users', user.uid);
          onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            }
            // We are confident about the user's state here.
            setLoading(false);
          });
        } else {
          setUser(null);
          setUserData(null);
          // No user, we can stop loading.
          setLoading(false);
        }
      });
      
      return unsubscribe;
    };

    processAuth();
    
    // The cleanup function for the useEffect will be handled by returning the unsubscribe function from onAuthStateChanged
  }, []); // The empty dependency array is CRITICAL to ensure this runs only once.


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Set loading to true immediately to show loader while redirecting.
      setLoading(true); 
      await signInWithRedirect(auth, provider);
      // The page will redirect, so no further code here will execute.
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: 'Could not start the sign-in process. Please try again.',
      });
      // Reset loading state on error if redirect fails.
      setLoading(false); 
    }
  };
  
  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/');
  };

  // This loading screen is the most important part of the fix.
  // It prevents the rest of the app from rendering until Firebase has
  // confirmed the user's authentication state, thus preventing the redirect loop.
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
