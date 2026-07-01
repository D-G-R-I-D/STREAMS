/**
 * STREAMS — Firebase Configuration
 * 
 * Firebase Auth handles Google Sign-In (FREE, no billing needed)
 * Audio files stored locally in IndexedDB (FREE, no storage fees)
 */

 // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBkeva-FfZ_yBF-GB9E-8UuvhVJEvMNk4Y",
    authDomain: "streams-dc14.firebaseapp.com",
    projectId: "streams-dc14",
    storageBucket: "streams-dc14.firebasestorage.app",
    messagingSenderId: "258675125700",
    appId: "1:258675125700:web:3552efc5ad3c9e71620891",
    measurementId: "G-46VDBYB552"
  };

// ========== CHECK IF CONFIGURED ==========
function isFirebaseConfigured() {
    return firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0;
}
