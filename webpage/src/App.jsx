import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import AuthPage from "./components/AuthPage";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "./index.css"
import "tailwindcss";
import "daisyui";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div style={{ padding: 16 }}>
        <h2>Welcome, {user.email}</h2>
        {/* Your Minii app content here */}
      </div>
    </>
  );
}

export default App;
