// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBKPthczklpIZoKqEn0e6jp0qZgq6ssTMU",
    authDomain: "analysis-project-a4d63.firebaseapp.com",
    projectId: "analysis-project-a4d63",
    storageBucket: "analysis-project-a4d63.firebasestorage.app",
    messagingSenderId: "255024459962",
    appId: "1:255024459962:web:820caca52f64bec4dc9283",
    measurementId: "G-MJMG5LV2GV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { app, analytics, auth, provider, signInWithPopup, signOut, onAuthStateChanged };
