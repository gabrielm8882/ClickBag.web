
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
    const processAuth = async () => {
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
      } finally {
        // This is now the single source of truth for auth state.
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            setUser(user);
            const userDocRef = doc(db, 'users', user.uid);
            const unsubUserData = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists()) {
                setUserData(docSnap.data() as UserData);
              } else {
                // If the doc doesn't exist for some reason, maybe it's still being created.
                // We don't want to show a broken state. We can keep userData as null.
                setUserData(null);
              }
              setLoading(false);
            }, (error) => {
              console.error("Error with user data snapshot:", error);
              setUserData(null);
              setLoading(false);
            });
            // Cleanup the user data listener when the auth state changes
            return () => unsubUserData();
          } else {
            setUser(null);
            setUserData(null);
            setLoading(false);
          }
        });

        return () => unsubscribe();
      }
    };

    processAuth();
    
  }, []); 


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true); 
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: 'Could not start the sign-in process. Please try again.',
      });
      setLoading(false); 
    }
  };
  
  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/');
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
