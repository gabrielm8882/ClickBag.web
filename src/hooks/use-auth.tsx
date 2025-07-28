
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import { getAdditionalUserInfo } from 'firebase/auth';

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

  useEffect(() => {
    const processAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User has just signed in via redirect.
          const user = result.user;
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            // Create a document for the new user.
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { 
              totalPoints: 0, 
              totalTrees: 0, 
              displayName: user.displayName, 
              email: user.email 
            });
          }
        }
      } catch (error) {
        console.error("Error processing redirect result:", error);
      }

      // onAuthStateChanged will handle setting the user state for both
      // initial load and after the redirect has been processed.
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setUserData(doc.data() as UserData);
            }
            // We have the user and their data (or confirmed it doesn't exist yet)
            setLoading(false);
          });
          return unsubscribeFirestore;
        } else {
          // No user is signed in.
          setUser(null);
          setUserData(null);
          setLoading(false);
        }
      });
      return unsubscribe;
    };

    processAuth();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };
  
  const signOut = async () => {
    await auth.signOut();
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
