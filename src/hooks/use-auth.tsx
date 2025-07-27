
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
    // This effect handles the result of a sign-in operation that uses a redirect flow.
    // getRedirectResult is called on every page load to check if the user is returning
    // from a successful sign-in with a provider like Google.
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        // If 'result' is not null, the user has successfully signed in via redirect.
        if (result) {
          const additionalInfo = getAdditionalUserInfo(result);
           if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('isNewUser', 'true');
          }
          toast({
            title: additionalInfo?.isNewUser ? "Account created" : "Login successful",
            description: additionalInfo?.isNewUser ? "Welcome to ClickBag!" : "Welcome back!",
          });
          // The onAuthStateChanged listener below will handle setting the user state.
          // We don't need to manually push to the dashboard here, as the router logic
          // in components will handle it based on the updated auth state.
        }
      } catch (error: any) {
        // Handle potential errors, e.g., if the user cancels the flow.
        console.error("Error handling redirect result:", error);
         toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
      } finally {
        // This is a good place to stop a global loading indicator if you have one
        // specifically for the redirect operation.
      }
    };

    handleRedirectResult();
  }, [toast]);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        // If user logs out, clear user data and stop loading
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      // If user is logged in, listen for user data changes
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        } else {
          // If user doc doesn't exist, set to default
          setUserData({ totalPoints: 0, totalTrees: 0 });
        }
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
