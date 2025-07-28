
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
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
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
    let unsubscribeSnapshot: () => void = () => {};

    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        console.log("Auth object before getRedirectResult:", auth);
        console.log("Session storage keys before getRedirectResult:", Object.keys(sessionStorage));

        const result = await getRedirectResult(auth);
        
        console.log("Auth object after getRedirectResult:", auth);
        console.log("Session storage keys after getRedirectResult:", Object.keys(sessionStorage));


        if (result?.user) {
          console.log("✅ Signed in via Google redirect:", result.user);
          const currentUser = result.user;
          setUser(currentUser);
          
          const isNew = getAdditionalUserInfo(result)?.isNewUser;
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
          } else {
             const userDoc = await getDoc(userDocRef);
             if (!userDoc.exists()) {
                console.log("Existing user with no Firestore doc, creating one.");
                await setDoc(userDocRef, {
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    totalPoints: 0,
                    totalTrees: 0,
                }, { merge: true });
             }
          }

          unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            }
          });

          setLoading(false);
          router.push('/dashboard');
          return; // Stop execution to avoid attaching onAuthStateChanged unnecessarily
        }

        // If no redirect result, set up the regular auth state listener
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            if (user?.uid !== currentUser.uid) { // Prevent re-running for the same user
              setUser(currentUser);
              
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDoc = await getDoc(userDocRef);
              if (!userDoc.exists()) {
                 console.log("Existing user with no Firestore doc, creating one.");
                 await setDoc(userDocRef, {
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    totalPoints: 0,
                    totalTrees: 0,
                 }, { merge: true });
              }

              unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                  setUserData(docSnap.data() as UserData);
                }
              });
            }
          } else {
            setUser(null);
            setUserData(null);
          }
          setLoading(false);
        });

        return () => {
          unsubscribeAuth();
          if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
          }
        };

      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setLoading(false);
      }
    };

    const cleanupPromise = initializeAuth();

    return () => {
      cleanupPromise.then(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, []);


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
