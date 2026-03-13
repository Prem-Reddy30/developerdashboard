import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB5DklMwoiBAzMPOL0RhaX5jo_L4qtNms0",
  authDomain: "github-26d66.firebaseapp.com",
  projectId: "github-26d66",
  storageBucket: "github-26d66.firebasestorage.app",
  messagingSenderId: "997096435925",
  appId: "1:997096435925:web:114974801b8e3c392b725c",
  measurementId: "G-761YC3VMW2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const githubProvider = new GithubAuthProvider();

export { auth, githubProvider, signInWithPopup, signOut, onAuthStateChanged };
