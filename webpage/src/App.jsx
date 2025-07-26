// src/App.jsx
import React, { useEffect, useState } from "react";
import AuthPage from "./components/AuthPage";
import SetDisplayName from "./components/SetDisplayName";
import Navbar from "./components/Navbar";
import FriendRequests from "./components/FriendRequests";
import AnimationsDashboard from "./components/AnimationsDashboard";
import AnimationDashboardPlayer from "./components/AnimationDashboardPlayer";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import "./index.css"
function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserData(firebaseUser.uid);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid) => {
    try {
      const userDataRef = ref(db, `users/${uid}`);
      const snapshot = await get(userDataRef);
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDisplayNameSet = async () => {
    // Reload user data after display name is set
    if (user) {
      await loadUserData(user.uid);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'friends':
        return <FriendRequests />;
      case 'animations':
        return <AnimationsDashboard />;
      case 'profile':
        return (
          <div className="container mx-auto py-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Profile</h2>
                {userData && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-16">
                          <span className="text-xl">
                            {(userData.displayName || userData.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{userData.displayName}</h3>
                        <p className="text-base-content/70">{userData.email}</p>
                      </div>
                    </div>
                    
                    <div className="divider"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-title">Account Created</div>
                        <div className="stat-value text-sm">
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-title">Email Status</div>
                        <div className="stat-value text-sm">
                          <div className={`badge ${user.emailVerified ? 'badge-success' : 'badge-warning'}`}>
                            {user.emailVerified ? 'Verified' : 'Not Verified'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-title">Friends</div>
                        <div className="stat-value text-sm">
                          {Object.keys(userData.friends || {}).length}
                        </div>
                      </div>
                      
                      <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-title">Animations Received</div>
                        <div className="stat-value text-sm">
                          {Object.keys(userData.receivedAnimations || {}).length}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="container mx-auto py-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="text-center mb-6">
                  <h1 className="text-4xl font-bold mb-2">Welcome to Minii!</h1>
                  <p className="text-xl text-base-content/70">
                    Hello, {userData?.displayName}! 👋
                  </p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <AnimationDashboardPlayer 
                    userData={userData}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/70">Loading Minii...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show display name setup if user hasn't set display name yet
  if (userData && !userData.displayNameSet) {
    return <SetDisplayName onComplete={handleDisplayNameSet} />;
  }

  // Show main app
  return (
    <div className="min-h-screen bg-base-100">
      <Navbar 
        onLogout={handleLogout} 
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      {renderCurrentView()}
    </div>
  );
}

export default App;
