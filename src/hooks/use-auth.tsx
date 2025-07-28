
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // If user object exists, we are logged in.
        // Set up listener for user-specific data.
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          } else {
            setUserData({ totalPoints: 0, totalTrees: 0 });
          }
          setLoading(false); // Stop loading once user data is fetched/set.
        });
        // We might need to return this unsubscribe function, but onAuthStateChanged already handles cleanup.
      } else {
        // No user is signed in.
        setUserData(null);
        setLoading(false); // Stop loading.
      }
    });

    // Handle the redirect result separately on initial load.
    // This is crucial to prevent the race condition.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User has successfully signed in or signed up via redirect.
          // onAuthStateChanged will fire and handle the user state update.
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('isNewUser', 'true');
             toast({
                title: "Account created",
                description: "Welcome to ClickBag!",
            });
          } else {
             toast({
                title: "Login successful",
                description: "Welcome back!",
            });
          }
        }
      })
      .catch((error) => {
        console.error("Error handling redirect result:", error);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
      });

    // Cleanup the onAuthStateChanged listener when the component unmounts.
    return () => unsubscribe();
  }, [toast]);


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
