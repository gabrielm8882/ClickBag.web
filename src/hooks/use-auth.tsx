
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
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        // First, check for the result of a redirect sign-in. This is the most important step.
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          console.log("Signed in via redirect", result.user);
          const currentUser = result.user;
          setUser(currentUser); // Set user state immediately

          const isNew = getAdditionalUserInfo(result)?.isNewUser;
          const userDocRef = doc(db, 'users', currentUser.uid);

          if (isNew) {
            console.log("New user detected, creating Firestore document.");
            await setDoc(userDocRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              totalPoints: 0,
              totalTrees: 0,
            });
            sessionStorage.setItem('isNewUser', 'true');
          }
          
          // Set up the listener for user data and then stop loading.
          const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            }
            setLoading(false);
            router.push('/dashboard');
          });

          return; // Exit early, we have our user.
        }

        // If there was no redirect result, set up the normal auth state listener.
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            if (!user) { // Only run this block if the user state isn't already set
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data() as UserData);
                    }
                    setLoading(false);
                });
            }
          } else {
            // No user is signed in.
            setUser(null);
            setUserData(null);
            setLoading(false);
          }
        });

      } catch (error) {
        console.error("Auth initialization failed:", error);
        setLoading(false);
      }
    };

    initAuth();
    
  }, []); // This should only run once on mount


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
