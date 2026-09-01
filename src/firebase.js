import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcCA0ZMpc6CmqDrJwCYJa9hWrZPX-75wM",
  authDomain: "bilal2.firebaseapp.com",
  databaseURL: "https://bilal2.firebaseio.com",
  projectId: "bilal2",
  storageBucket: "bilal2.firebasestorage.app",
  messagingSenderId: "279741020840",
  appId: "1:279741020840:web:c7289d6d8f91503d1c209d",
  measurementId: "G-XZPRE3LER1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable persistent login across refreshes
setPersistence(auth, browserLocalPersistence);