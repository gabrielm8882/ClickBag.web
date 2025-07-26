import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCw411oL8AA1WkFucgL-MFXFWaJvFmj3ww",
  authDomain: "clickbag.firebaseapp.com",
  projectId: "clickbag",
  storageBucket: "clickbag.appspot.com",
  messagingSenderId: "344787097382",
  appId: "1:344787097382:web:fee267eccab031c50813e7",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
