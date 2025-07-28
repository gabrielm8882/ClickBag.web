
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
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
    // This is the canonical way to handle auth state changes and redirects.
    // onAuthStateChanged fires once on initial load, and again whenever auth state changes.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // If we have a user, set up a real-time listener for their data.
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          } else {
            // This case can happen for a brand new user.
            setUserData({ totalPoints: 0, totalTrees: 0 });
          }
        });

        // Make sure to clean up the Firestore listener when the auth state changes.
        auth.onAuthStateChanged((user) => {
          if (!user) unsubscribeFirestore();
        });

      } else {
        // No user, clear user data.
        setUserData(null);
      }
      
      // We are no longer in a loading state.
      setLoading(false);
    });

    // Check for redirect result on initial load.
    // This should only run once.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // This means a user has just signed in via redirect.
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('isNewUser', 'true');
            // If the user is new, we must create their document in Firestore.
            const userDocRef = doc(db, 'users', result.user.uid);
            // Use getDoc to avoid race condition with the onSnapshot listener.
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              await setDoc(userDocRef, { totalPoints: 0, totalTrees: 0 });
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error during getRedirectResult:", error);
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not complete the sign-in process. Please try again.",
        });
      });

    // Cleanup subscription on unmount
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
