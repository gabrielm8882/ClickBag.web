
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
  getAdditionalUserInfo,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeAuth: () => void;
    let unsubscribeSnapshot: () => void = () => {}; // Initialize with a no-op function

    const initializeAuth = async () => {
      try {
        console.log("Attempting to initialize authentication.");
        await setPersistence(auth, browserLocalPersistence);
        console.log("Auth persistence set to browserLocalPersistence.");

        // Await redirect result first
        console.log("Checking for redirect result...");
        const redirectResult = await getRedirectResult(auth);
        console.log("Redirect result:", redirectResult);

        if (redirectResult?.user) {
          console.log("✅ Signed in via Google redirect:", redirectResult.user);
          const currentUser = redirectResult.user;
          setUser(currentUser);

          const isNew = getAdditionalUserInfo(redirectResult)?.isNewUser;
          const userDocRef = doc(db, 'users', currentUser.uid);

          if (isNew) {
            console.log("New user detected via redirect, creating Firestore document.");
            await setDoc(userDocRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              totalPoints: 0,
              totalTrees: 0,
            }, { merge: true });
            sessionStorage.setItem('isNewUser', 'true');
          }

          // Set up listener for user data
          unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            }
            console.log("Snapshot listener set up for user data.");
            // Navigation will happen after loading is set to false
          });

          setLoading(false);
          console.log("Loading set to false after redirect sign-in.");
          router.push('/dashboard');

        } else {
          // No redirect result, set up the regular auth state listener
          console.log("No redirect result found. Setting up onAuthStateChanged listener.");
          unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log("Auth state changed:", currentUser);
            if (currentUser) {
              console.log("✅ User signed in:", currentUser);
              setUser(currentUser);
              const userDocRef = doc(db, 'users', currentUser.uid);
              // Set up listener for user data
              unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                  if (docSnap.exists()) {
                      setUserData(docSnap.data() as UserData);
                  }
                  console.log("Snapshot listener set up for user data after state change.");
                  // Navigation will happen after loading is set to false
              });

              setLoading(false);
              console.log("Loading set to false after auth state change.");
              router.push('/dashboard');

            } else {
              console.log("🕒 No user signed in.");
              setUser(null);
              setUserData(null);
              setLoading(false);
              console.log("Loading set to false as no user is signed in.");
              // Stay on the current page (presumably login if not authenticated)
            }
          });
        }

      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setLoading(false);
        console.log("Loading set to false due to initialization error.");
        // Handle error, potentially redirect to a generic error page or show a message
      }
    };

    initializeAuth();

    // Cleanup function for useEffect
    return () => {
      console.log("Cleaning up auth listeners.");
      if (unsubscribeAuth) { // Check if unsubscribeAuth was assigned
        unsubscribeAuth();
      }
      if (unsubscribeSnapshot) { // Check if unsubscribeSnapshot was assigned
         unsubscribeSnapshot();
      }
    };

  }, []); // Empty dependency array ensures this runs only once on mount


  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserData(null);
    router.push('/login');
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

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
    console.log("Attempting Google sign-in with redirect.");
    // No need to await or handle navigation here, redirect will happen automatically
    await signInWithRedirect(auth, provider);
  };

  // Don't render children until authentication state is determined
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

