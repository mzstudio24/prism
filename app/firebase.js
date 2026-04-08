import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQotO7i7SEx0zjTrWcMEAPbhEb7IZI-IQ",
  authDomain: "prism-aixom.com", // <--- THIS IS THE CHANGED LINE!
  projectId: "prism-9b6ab",
  storageBucket: "prism-9b6ab.firebasestorage.app",
  messagingSenderId: "98575435300",
  appId: "1:98575435300:web:41acdffb9e63faaf48bab1",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);