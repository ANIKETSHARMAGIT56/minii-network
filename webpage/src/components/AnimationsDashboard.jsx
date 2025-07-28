// src/components/AnimationsDashboard.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';
import AnimationCreator from './AnimationCreator';
import AnimationPlayer from './AnimationPlayer';
import AnimationSender from './AnimationSender';

export default function AnimationsDashboard() {
  const [myAnimation, setMyAnimation] = useState(null);
  const [receivedAnimations, setReceivedAnimations] = useState({});
  const [sentAnimations, setSentAnimations] = useState({});
  const [friends, setFriends] = useState({});
  const [showCreator, setShowCreator] = useState(false);
  const [showSender, setShowSender] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const currentUser = auth.currentUser;

  // Initialize Cloud Functions OUTSIDE of render cycle
  const functions = getFunctions();

  // Memoized function to load friend details
  const loadFriendDetails = useCallback(async (friendsData) => {
    if (!friendsData || Object.keys(friendsData).length === 0) {
      setFriends({});
      return;
    }

    setFriendsLoading(true);
    try {
      const friendUids = Object.keys(friendsData);
      const getFriendDetailsFunction = httpsCallable(functions, 'getFriendDetails');
      const result = await getFriendDetailsFunction({ friendUids });
      
      const friendsWithDetails = {};
      Object.entries(friendsData).forEach(([uid, timestamp]) => {
        const friendData = result.data.friendDetails[uid];
        if (friendData) {
          friendsWithDetails[uid] = {
            displayName: friendData.displayName || friendData.email || 'Unknown User',
            email: friendData.email || '',
            profilePicture: friendData.profilePicture || null,
            uid,
            friendsSince: timestamp
          };
        } else {
          // Fallback data if Cloud Function doesn't return data
          friendsWithDetails[uid] = {
            displayName: 'Unknown User',
            email: '',
            profilePicture: null,
            uid,
            friendsSince: timestamp
          };
        }
      });
      
      setFriends(friendsWithDetails);
    } catch (error) {
      console.error('Error loading friend details:', error);
      // Create fallback friend data
      const fallbackFriends = {};
      Object.entries(friendsData).forEach(([uid, timestamp]) => {
        fallbackFriends[uid] = {
          displayName: 'Unknown User',
          email: '',
          profilePicture: null,
          uid,
          friendsSince: timestamp
        };
      });
      setFriends(fallbackFriends);
    } finally {
      setFriendsLoading(false);
    }
  }, [functions]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribers = [];

    // Listen for personal animation
    const myAnimRef = ref(db, `users/${currentUser.uid}/myAnimation`);
    const unsubMyAnim = onValue(myAnimRef, (snapshot) => {
      setMyAnimation(snapshot.val());
    });
    unsubscribers.push(unsubMyAnim);

    // Listen for received animations
    const receivedRef = ref(db, `users/${currentUser.uid}/receivedAnimations`);
    const unsubReceived = onValue(receivedRef, (snapshot) => {
      setReceivedAnimations(snapshot.val() || {});
    });
    unsubscribers.push(unsubReceived);

    // Listen for sent animations
    const sentRef = ref(db, `users/${currentUser.uid}/sentAnimations`);
    const unsubSent = onValue(sentRef, (snapshot) => {
      setSentAnimations(snapshot.val() || {});
    });
    unsubscribers.push(unsubSent);

    // Get friends list - FIXED to prevent infinite calls
    const friendsRef = ref(db, `users/${currentUser.uid}/friends`);
    const unsubFriends = onValue(friendsRef, (snapshot) => {
      const friendsData = snapshot.val() || {};
      // Call the memoized function to load friend details
      loadFriendDetails(friendsData);
      setLoading(false);
    });
    unsubscribers.push(unsubFriends);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser, loadFriendDetails]); // Now loadFriendDetails is stable

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Personal Animation Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">My Personal Animation</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreator(!showCreator)}
            >
              {myAnimation ? 'Edit' : 'Create'} Animation
            </button>
          </div>
          
          {showCreator ? (
            <AnimationCreator 
              isPersonal={true}
              onClose={() => setShowCreator(false)}
            />
          ) : (
            <div className="flex justify-center">
              <AnimationPlayer 
                animation={myAnimation} 
                size="large"
                showControls={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Send Animation Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Send Animation to Friends</h2>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowSender(!showSender)}
            >
              Create & Send
            </button>
          </div>
          
          {showSender && (
            <AnimationSender 
              friends={friends}
              onClose={() => setShowSender(false)}
            />
          )}
        </div>
      </div>

      {/* Animations Section with Tabs */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="tabs tabs-boxed mb-4">
            <button 
              className={`tab ${activeTab === 'received' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('received')}
            >
              Received ({Object.keys(receivedAnimations).length})
            </button>
            <button 
              className={`tab ${activeTab === 'sent' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('sent')}
            >
              Sent ({Object.keys(sentAnimations).length})
            </button>
          </div>

          {friendsLoading && (
            <div className="text-center mb-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">Loading friend details...</span>
            </div>
          )}

          {/* Received Animations Tab Content */}
          {activeTab === 'received' && (
            <div>
              <h2 className="card-title mb-4">Animations from Friends</h2>
              
              {Object.keys(receivedAnimations).length === 0 ? (
                <p className="text-center text-base-content/70">
                  No animations received yet. Ask your friends to send you some!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(receivedAnimations).map(([friendUid, animation]) => {
                    const friend = friends[friendUid];
                    return (
                      <div key={friendUid} className="space-y-2">
                        <div className="text-center">
                          <span className="badge badge-primary">
                            From: {friend?.displayName || 'Loading...'}
                          </span>
                        </div>
                        <AnimationPlayer 
                          animation={animation}
                          size="medium"
                          showControls={true}
                        />
                        <div className="text-xs text-center text-base-content/50">
                          Received {animation.sentAt ? new Date(animation.sentAt).toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sent Animations Tab Content */}
          {activeTab === 'sent' && (
            <div>
              <h2 className="card-title mb-4">Animations Sent to Friends</h2>
              
              {Object.keys(sentAnimations).length === 0 ? (
                <p className="text-center text-base-content/70">
                  No animations sent yet. Create and send some animations to your friends!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(sentAnimations).map(([friendUid, animation]) => {
                    const friend = friends[friendUid];
                    return (
                      <div key={friendUid} className="space-y-2">
                        <div className="text-center">
                          <span className="badge badge-secondary">
                            To: {friend?.displayName || 'Loading...'}
                          </span>
                        </div>
                        <AnimationPlayer 
                          animation={animation}
                          size="medium"
                          showControls={true}
                        />
                        <div className="text-xs text-center text-base-content/50">
                          Sent {animation.sentAt ? new Date(animation.sentAt).toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
