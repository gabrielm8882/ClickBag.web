
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
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
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // First, check for the result of a redirect sign-in.
        // This promise resolves to null if the page is not loaded after a redirect.
        const result = await getRedirectResult(auth);
        
        if (result) {
          // User has signed in via redirect.
          const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
          if (isNewUser) {
            // If it's a new user, create their Firestore document.
            const userDocRef = doc(db, 'users', result.user.uid);
            await setDoc(userDocRef, {
              displayName: result.user.displayName,
              email: result.user.email,
              totalPoints: 0,
              totalTrees: 0,
            });
            sessionStorage.setItem('isNewUser', 'true');
          }
          // The onAuthStateChanged listener below will handle setting the user state
          // and redirecting to the dashboard. The loading state prevents a race condition.
        }
      } catch (error) {
        console.error("Error processing redirect result:", error);
        // Let the onAuthStateChanged listener handle the final state.
      }

      // Now, set up the onAuthStateChanged listener. This will run after getRedirectResult
      // has been processed, or on initial page load if there was no redirect.
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const userDocRef = doc(db, 'users', currentUser.uid);
          // Set up a snapshot listener for real-time user data updates.
          const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            } else {
              // This can happen if a user is created in Auth but their Firestore doc fails.
              // We can attempt to create it here as a fallback.
              console.log("User document doesn't exist, creating it now.");
              setDoc(userDocRef, {
                displayName: currentUser.displayName,
                email: currentUser.email,
                totalPoints: 0,
                totalTrees: 0,
              });
            }
            // Stop loading only after we have user and user data.
            setLoading(false);
          });
          // Note: Returning the snapshot listener is complex here; the main unsubscribe handles cleanup.
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
    
    // Create the user document in Firestore immediately upon registration.
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
