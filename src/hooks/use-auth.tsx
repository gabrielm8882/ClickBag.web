
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
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
    const checkAuth = async () => {
      setLoading(true);
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const additionalInfo = getAdditionalUserInfo(result);
          if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('isNewUser', 'true');
          }
          toast({
            title: additionalInfo?.isNewUser ? "Account created" : "Login successful",
            description: additionalInfo?.isNewUser ? "Welcome to ClickBag!" : "Welcome back!",
          });
        }
      } catch (error: any) {
        console.error("Error handling redirect result:", error);
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
      }

      const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (!currentUser) {
          setUserData(null);
          setLoading(false);
        }
      });
      
      return unsubscribeAuth;
    };

    checkAuth();
  }, [toast]);


  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        } else {
          setUserData({ totalPoints: 0, totalTrees: 0 });
        }
        setLoading(false);
      });
      return () => unsubscribeFirestore();
    }
  }, [user]);

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
