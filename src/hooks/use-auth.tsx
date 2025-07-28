
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult, getAdditionalUserInfo, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
    // This effect runs once on mount to handle the initial auth state,
    // including processing any results from a completed redirect sign-in.
    
    // First, check if a redirect operation has just completed.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User has successfully signed in via redirect.
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            // This is a one-time flag to welcome new users.
            sessionStorage.setItem('isNewUser', 'true');
            // Create user document for new user
            const userDocRef = doc(db, 'users', result.user.uid);
            setDoc(userDocRef, { totalPoints: 0, totalTrees: 0 });
          }
        }
        // If result is null, it means no redirect was in progress.
      })
      .catch((error) => {
        console.error("Error during getRedirectResult:", error);
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not complete the sign-in process. Please try again.",
        });
      })
      .finally(() => {
        // After attempting to get the redirect result, set up the permanent
        // auth state listener. This will manage the user's session from now on.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            const userDocRef = doc(db, 'users', currentUser.uid);
            
            // Listen for real-time updates to the user's data (points, trees, etc.)
            const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
              if (doc.exists()) {
                setUserData(doc.data() as UserData);
              } else {
                // This might happen for a new user whose doc hasn't been created yet.
                // We'll set a default and let the redirect handler create the doc.
                setUserData({ totalPoints: 0, totalTrees: 0 });
              }
              // Only stop loading once we have the user and their data.
              setLoading(false);
            });
            
            // Return the cleanup function for the firestore listener
            return () => unsubscribeFirestore();

          } else {
            // No user is signed in.
            setUser(null);
            setUserData(null);
            setLoading(false);
          }
        });

        // Return the cleanup function for the auth state listener
        return () => unsubscribe();
      });
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
