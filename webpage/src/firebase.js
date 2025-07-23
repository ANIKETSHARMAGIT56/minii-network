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

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

