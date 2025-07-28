
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export interface UserData {
  totalPoints: number;
  totalTrees: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // This effect should only run once on mount to handle the initial auth state.
    
    // First, process the redirect result. This is crucial to prevent a race condition.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User has successfully signed in or signed up via redirect.
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('isNewUser', 'true'); // Mark as new user for a one-time welcome message
            toast({
                title: "Account created",
                description: "Welcome to ClickBag!",
            });
          }
          // The onAuthStateChanged observer below will handle setting the user state.
          // We redirect here to ensure the user lands on the dashboard after a successful Google sign-in.
          router.push('/dashboard');
        }

        // After handling the redirect, set up the onAuthStateChanged listener.
        // This is the single source of truth for the user's auth state.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            // Now that we have a user, listen for their data from Firestore.
            const userDocRef = doc(db, 'users', currentUser.uid);
            const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
              if (doc.exists()) {
                setUserData(doc.data() as UserData);
              } else {
                setUserData({ totalPoints: 0, totalTrees: 0 });
              }
              setLoading(false); // Stop loading only after user and their data is loaded.
            });
            // Important: Return the Firestore listener cleanup function.
            return () => unsubscribeFirestore();
          } else {
            // No user is signed in.
            setUser(null);
            setUserData(null);
            setLoading(false); // Stop loading.
          }
        });
        
        // Return the auth listener cleanup function.
        return unsubscribe;

      })
      .catch((error) => {
        console.error("Error handling redirect result:", error);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
        setLoading(false); // Stop loading even if there's an error.
      });

  }, [toast, router]);


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background">
        <LeafLoader />
        <p className="mt-4 text-muted-foreground">Loading ClickBag...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
