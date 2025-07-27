
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
    // This function will handle both redirect results and ongoing auth state.
    const checkAuthAndHandleRedirect = async () => {
      try {
        // Check for redirect result first. This runs once on page load.
        const result = await getRedirectResult(auth);
        if (result) {
          // User has successfully signed in or signed up via redirect.
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            // This flag helps us show a welcome message or onboarding.
            sessionStorage.setItem('isNewUser', 'true');
          }
          toast({
            title: additionalInfo?.isNewUser ? "Account created" : "Login successful",
            description: additionalInfo?.isNewUser ? "Welcome to ClickBag!" : "Welcome back!",
          });
          // onAuthStateChanged will handle setting the user state.
        }
      } catch (error: any) {
        console.error("Error handling redirect result:", error);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
      }

      // Set up the onAuthStateChanged listener.
      // This is the single source of truth for the user's sign-in state.
      const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        // If there's no user, we know they are logged out. Stop loading.
        if (!currentUser) {
          setUserData(null);
          setLoading(false);
        }
        // If there is a user, we will wait for their data to load in the next effect.
      });

      return unsubscribeAuth;
    };

    checkAuthAndHandleRedirect();
  }, [toast]);


  useEffect(() => {
    // This effect runs when the user object changes.
    if (user) {
      // User is authenticated, now fetch their app-specific data.
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        } else {
          // If the user doc doesn't exist, create it with default values.
          setUserData({ totalPoints: 0, totalTrees: 0 });
        }
        // Once user data is loaded, we can stop the main loading screen.
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
