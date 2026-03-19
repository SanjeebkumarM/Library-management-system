import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

//This is my firebase API configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDxry6zjs2NOwm_baJG6YnvNxDOnxTRO8A",
  authDomain: "campus-library-app.firebaseapp.com",
  projectId: "campus-library-app",
  storageBucket: "campus-library-app.firebasestorage.app",
  messagingSenderId: "122325336564",
  appId: "1:122325336564:web:315155c14777171c5f39a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
// Initialize Firebase Authentication
const auth = getAuth(app);
// Export them so my other JavaScript files can use them!
export { db, auth };