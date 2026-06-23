/**
 * STREAMS — Firebase Configuration
 * 
 * ============================================================
 *  SETUP (one-time, takes 3 minutes):
 * ============================================================
 *
 *  1. Go to https://console.firebase.google.com
 *  2. Click "Create a project" → name it "streams-music" → Continue
 *  3. (Optional) Disable Google Analytics → Create Project
 *  4. Once created, click the web icon </> to add a web app
 *  5. Name it "streams-web" → Register app
 *  6. Copy the firebaseConfig object shown and paste it below
 *  7. Go to "Authentication" in the left sidebar → "Get Started"
 *  8. Enable "Email/Password" provider → Save
 *  9. Enable "Google" provider → enter a support email → Save
 * 10. Done! Refresh your app.
 *
 * ============================================================
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
