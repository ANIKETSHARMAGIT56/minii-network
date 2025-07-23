import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD-lnauMtphSy5bzPjJjPkHMqXet4WiGJc",
  authDomain: "minii-network.firebaseapp.com",
  databaseURL: "https://minii-network-default-rtdb.firebaseio.com",
  projectId: "minii-network",
  storageBucket: "minii-network.firebasestorage.app",
  messagingSenderId: "669212655530",
  appId: "1:669212655530:web:e323b49600b668d9b175d3",
  measurementId: "G-660V88PEKB"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

// Connect to Firebase emulators if running locally
if (window.location.hostname === "localhost") {
  const authHost = import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_HOST || "localhost";
  const authPort = import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT || "9099";
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });

  const databaseHost = import.meta.env.VITE_FIREBASE_EMULATOR_DATABASE_HOST || "localhost";
  const databasePort = import.meta.env.VITE_FIREBASE_EMULATOR_DATABASE_PORT || 9000;
  connectDatabaseEmulator(db, databaseHost, Number(databasePort));

  // If you add Firestore in future, connect Firestore emulator the same way.
}

export default app;