
'use client';

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
    // This is the definitive, robust way to handle auth state.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // First, see if a user is returned by the observer.
      if (user) {
        setUser(user);
        // If there's a user, set up a listener for their data.
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          }
          // The main loading state is finished once we have a user and their data.
          setLoading(false);
        });
        // We'll return this to clean it up.
        return unsubscribeFirestore;
      }

      // If onAuthStateChanged returns no user, we're not done yet.
      // We need to check if we're in the middle of a redirect flow.
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // If we get a result here, it means the user just signed in.
          // onAuthStateChanged will fire again with the new user, so we don't need to setUser here.
          const additionalInfo = getAdditionalUserInfo(result);

          // Check if it's a new user. If so, create their document.
          if (additionalInfo?.isNewUser) {
            const userDocRef = doc(db, 'users', result.user.uid);
            // Check if doc exists to be safe, though it shouldn't for a new user.
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                await setDoc(userDocRef, { totalPoints: 0, totalTrees: 0 });
            }
            toast({
              title: "✅ Registration Complete",
              description: `Welcome to ClickBag, ${result.user.displayName}!`,
            });
            sessionStorage.setItem('isNewUser', 'true');
          } else {
             toast({
                title: "✅ Login Successful",
                description: `Welcome back, ${result.user.displayName}!`,
            });
          }
        } else {
          // If there's no user and no redirect result, they are truly logged out.
          setUser(null);
          setUserData(null);
          setLoading(false);
        }
      } catch (error: any) {
        // Handle errors from getRedirectResult (e.g., network issues)
        console.error("Error during getRedirectResult:", error);
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not complete the sign-in process. Please try again.",
        });
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    // Cleanup the subscription when the component unmounts.
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
