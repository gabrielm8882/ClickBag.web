
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
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // If a user is logged in
      if (currentUser) {
        setUser(currentUser);
        
        // Unsubscribe from any previous Firestore listener
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }

        // Set up a new listener for the current user's data
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          } else {
            // User document might not exist yet for a new sign-up
            setUserData({ totalPoints: 0, totalTrees: 0 });
          }
          // Only stop loading once we have both user and user data
          setLoading(false);
        });
        
        // If the user is logged in, and we are on login/register, redirect to dashboard
        // This is a check for existing sessions
        if (window.location.pathname === '/login' || window.location.pathname === '/register') {
           router.push('/dashboard');
        }

      } else {
        // No user is signed in
        setUser(null);
        setUserData(null);
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
        setLoading(false);
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
          router.push('/dashboard');
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

    // Cleanup both listeners when the component unmounts.
    return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
        }
    };
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
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
