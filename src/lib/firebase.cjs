// firebase.js (ES Module version)
import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { 
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwvrGmFmVwjmXS8B7WXyoBHBLPv5eGnng",
  authDomain: "onquest-bdc27.firebaseapp.com",
  projectId: "onquest-bdc27",
  storageBucket: "onquest-bdc27.appspot.com",
  messagingSenderId: "903211586009",
  appId: "1:903211586009:web:5917214d0a1d7c081ec9c8",
  measurementId: "G-47YDKS1VHH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();

// Auth functions
const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
const logout = () => signOut(auth);

// Export everything
export { 
  app,
  auth,
  db,
  storage,
  googleProvider,
  signInWithGoogle,
  logout,
  
  // Firestore functions
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch,
  
  // Storage functions
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

// Default export
export default {
  app,
  auth,
  db,
  storage,
  googleProvider,
  signInWithGoogle,
  logout,
  
  // Firestore
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch,
  
  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};