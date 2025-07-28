
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import { useToast } from './use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    // This is the single source of truth for auth state.
    // onAuthStateChanged handles all session scenarios:
    // - Initial load (user is null or a persisted user object)
    // - After login/logout
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // User is authenticated, now listen for their data in Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          }
          // We have the user and their data (or know it doesn't exist yet).
          // We can stop the main loading screen.
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      
      // Check if this is a new user
      if (additionalInfo?.isNewUser) {
        // This is a registration. Create a document in Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { 
          totalPoints: 0, 
          totalTrees: 0, 
          displayName: user.displayName, 
          email: user.email 
        });
        sessionStorage.setItem('isNewUser', 'true');
        toast({
          title: "✅ Registration Successful",
          description: `Welcome to ClickBag, ${user.displayName}!`,
        });
      } else {
        // This is a login for an existing user.
        toast({
          title: "✅ Login Successful",
          description: `Welcome back, ${user.displayName}!`,
        });
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      // We re-throw the error so the component calling this function
      // can handle UI states (like loading spinners) and show specific toasts.
      throw error;
    }
  };
  
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // The loading screen is critical. It prevents the app from rendering
  // a protected page or the login page prematurely, which is the
  // primary cause of redirect loops and flickering.
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
