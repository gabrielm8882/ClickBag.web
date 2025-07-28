
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This configuration is for your Firebase project.
// The authDomain is the default domain for your project's Firebase Hosting.
const firebaseConfig = {
  apiKey: "AIzaSyCw411oL8AA1WkFucgL-MFXFWaJvFmj3ww",
  authDomain: "clickbag.firebaseapp.com",
  projectId: "clickbag",
  storageBucket: "clickbag.appspot.com",
  messagingSenderId: "344787097382",
  appId: "1:344787097382:web:fee267eccab031c50813e7",
};

// Initialize Firebase only once.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set session persistence. browserLocalPersistence saves the user's session
// even after the browser window is closed. This is crucial for a good user experience.
setPersistence(auth, browserLocalPersistence);


export { app, auth, db };
