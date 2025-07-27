
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import { useToast } from './use-toast';

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, check for the result of a redirect sign-in.
        // This is the highest priority check for authentication on page load.
        const result = await getRedirectResult(auth);
        if (result) {
          // If a result is found, a user has successfully signed in via redirect.
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('isNewUser', 'true');
          }
          toast({
            title: additionalInfo?.isNewUser ? "Account created" : "Login successful",
            description: additionalInfo?.isNewUser ? "Welcome to ClickBag!" : "Welcome back!",
          });
          // The onAuthStateChanged listener below will now correctly handle the authenticated user.
        }
      } catch (error: any) {
        // Handle potential errors during redirect result retrieval.
        console.error("Error handling redirect result:", error);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
      }

      // After handling the redirect, set up the onAuthStateChanged listener.
      // This will now correctly reflect the user's state, whether they just
      // signed in via redirect or were already logged in.
      const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (!currentUser) {
          // If user logs out or is not logged in, clear data and finish loading.
          setUserData(null);
          setLoading(false);
        }
      });

      // The function returned by onAuthStateChanged is the unsubscribe function.
      // We return it so it can be called when the component unmounts.
      return unsubscribeAuth;
    };

    checkAuth();
  }, [toast]);


  useEffect(() => {
    if (user) {
      // If user is logged in, listen for user data changes from Firestore.
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        } else {
          // If user doc doesn't exist (e.g., brand new user), set to default.
          setUserData({ totalPoints: 0, totalTrees: 0 });
        }
        // Finish loading now that we have both auth and user data.
        setLoading(false);
      });
      return () => unsubscribeFirestore();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background">
        <LeafLoader />
        <p className="mt-4 text-muted-foreground">Loading ClickBag...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
