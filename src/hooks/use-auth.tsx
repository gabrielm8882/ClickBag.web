
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import { useRouter } from 'next/navigation';

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
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleUser = useCallback(async (rawUser: User | null) => {
    if (rawUser) {
      setUser(rawUser);
      const userDocRef = doc(db, 'users', rawUser.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          // This case can happen briefly if a new user's doc hasn't been created yet.
          // The getRedirectResult logic should handle creating it.
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error with user data snapshot:", error);
        setUserData(null);
        setLoading(false);
      });
      return unsub;
    } else {
      setUser(null);
      setUserData(null);
      setLoading(false);
      return () => {};
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    // This is the primary listener for auth state.
    // It will fire after getRedirectResult is processed or for any other auth change.
    const unsubscribeAuthState = onAuthStateChanged(auth, handleUser);

    // This handles the result from a Google Sign-In redirect.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in via redirect.
          const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
          if (isNewUser) {
            // If it's a new user, create their document in Firestore.
            const userDocRef = doc(db, 'users', result.user.uid);
            await setDoc(userDocRef, {
              displayName: result.user.displayName,
              email: result.user.email,
              totalPoints: 0,
              totalTrees: 0,
            });
            sessionStorage.setItem('isNewUser', 'true');
          }
        }
        // If result is null, it means no redirect was in progress.
        // The onAuthStateChanged listener will handle any existing session.
        // We set loading to false here only if no redirect occurred,
        // otherwise handleUser will set it.
        if (!result) {
            setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error getting redirect result:", error);
        setLoading(false);
      });
      
    return () => {
      unsubscribeAuthState();
    };
  }, [handleUser]); 
  
  const signOut = async () => {
    await firebaseSignOut(auth);
    // No need to push, onAuthStateChanged will trigger a rerender which will cause redirect
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  }

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Create the user document in Firestore immediately upon registration
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
      displayName: name,
      email: email,
      totalPoints: 0,
      totalTrees: 0,
    });
    
    sessionStorage.setItem('isNewUser', 'true');
    await sendEmailVerification(userCredential.user);
    
    router.push('/verify-email');
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Use signInWithRedirect for a more robust flow that works in previews/iframes.
    await signInWithRedirect(auth, provider);
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
    <AuthContext.Provider value={{ user, userData, loading, signOut, signInWithEmail, registerWithEmail, signInWithGoogle }}>
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
