
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
    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // This is the first sign-in for this user.
          const userDocRef = doc(db, 'users', result.user.uid);
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            await setDoc(userDocRef, { 
              totalPoints: 0, 
              totalTrees: 0, 
              displayName: result.user.displayName, 
              email: result.user.email 
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
        if (error.code !== 'auth/no-auth-event') {
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not complete sign-in. Please try again.',
          });
        }
      }
    };
    
    // Process redirect result before setting up the listener
    processRedirectResult().finally(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setUserData(doc.data() as UserData);
            }
            setLoading(false);
          });
          return unsubscribeFirestore;
        } else {
          setUser(null);
          setUserData(null);
          setLoading(false);
        }
      });
      
      return () => unsubscribe();
    });
    
  }, [toast, router]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // The redirect will cause the page to unload, so we don't need to handle success here.
      // The `useEffect` hook will handle the result when the user is redirected back.
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: 'Could not start the sign-in process. Please try again.',
      });
    }
  };
  
  const signOut = async () => {
    await firebaseSignOut(auth);
    // No need to redirect here, the onAuthStateChanged listener will handle it.
  };

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
