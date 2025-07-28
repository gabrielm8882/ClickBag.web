
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

  useEffect(() => {
    // This combined effect handles all authentication state changes.
    // It's structured to prevent race conditions during redirects.
    const processAuth = async () => {
      try {
        // First, check if there's a result from a redirect sign-in
        const result = await getRedirectResult(auth);
        
        if (result) {
          // If a user is new, create their Firestore document.
          const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
          if (isNewUser) {
            const userDocRef = doc(db, 'users', result.user.uid);
            await setDoc(userDocRef, {
              displayName: result.user.displayName,
              email: result.user.email,
              totalPoints: 0,
              totalTrees: 0,
            });
            sessionStorage.setItem('isNewUser', 'true');
          }
          // The onAuthStateChanged listener below will handle setting the user state.
        }
      } catch (error) {
        console.error("Error processing redirect result:", error);
      }

      // Set up the primary listener for auth state.
      // This will fire after the redirect is processed OR for any other auth change.
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          // Fetch associated user data from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            } else {
              setUserData(null);
            }
            // Only stop loading after user and user data are confirmed.
            setLoading(false);
          });
          // Note: Returning the snapshot listener for cleanup is complex here.
          // The main auth unsubscribe handles the primary cleanup.
        } else {
          // No user is signed in.
          setUser(null);
          setUserData(null);
          setLoading(false);
        }
      });
      
      // Cleanup the auth listener when the component unmounts.
      return () => unsubscribe();
    };

    processAuth();
    
  }, []); 
  
  const signOut = async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will handle the state update and trigger re-render
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
    // Use signInWithRedirect for a more robust flow that works in all environments.
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
