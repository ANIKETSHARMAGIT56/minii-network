// src/components/AnimationDashboardPlayer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';

// Auto-playing Animation Player Component
function AutoPlayAnimationPlayer({ animation, size = 'medium', fullscreen = false }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playInterval, setPlayInterval] = useState(null);

  const sizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: fullscreen ? 'w-8 h-8' : 'w-6 h-6'
  };

  const containerSizes = {
    small: 'p-2',
    medium: 'p-3',
    large: fullscreen ? 'p-8' : 'p-4'
  };

  const gapSizes = {
    small: 'gap-1',
    medium: 'gap-1',
    large: fullscreen ? 'gap-2' : 'gap-1'
  };

  useEffect(() => {
    if (!animation?.frames || animation.frames.length === 0) return;

    let frameIndex = 0;
    const interval = setInterval(() => {
      setCurrentFrame(frameIndex);
      frameIndex = (frameIndex + 1) % animation.frames.length;
    }, animation.frameDuration || 500);
    
    setPlayInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [animation]);

  useEffect(() => {
    return () => {
      if (playInterval) clearInterval(playInterval);
    };
  }, [playInterval]);

  if (!animation) {
    return (
      <div className="card bg-base-200 p-4">
        <div className="text-center text-base-content/50">No animation</div>
      </div>
    );
  }

  const currentFrameData = animation.frames[currentFrame] || Array(8).fill().map(() => Array(8).fill(0));

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body p-4">
        <h3 className="font-semibold text-center mb-2">{animation.name}</h3>
        
        <div className="flex justify-center">
          <div className={`inline-block bg-black rounded-lg ${containerSizes[size]}`}>
            <div className={`grid grid-cols-8 ${gapSizes[size]}`}>
              {currentFrameData.map((row, rowIndex) =>
                row.map((pixel, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`${sizeClasses[size]} rounded-full ${
                      pixel 
                        ? 'bg-red-500 shadow-lg shadow-red-500/30' 
                        : 'bg-gray-800'
                    }`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Player Component - FIXED VERSION
export default function AnimationDashboardPlayer({ userData }) {
  const [selectedAnimation, setSelectedAnimation] = useState('personal');
  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [friendsData, setFriendsData] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentUser = auth.currentUser;

  // Initialize Cloud Functions OUTSIDE of render cycle
  const functions = getFunctions();

  // Use useCallback to memoize the function and prevent infinite re-renders
  const loadFriendsData = useCallback(async () => {
    if (!userData?.receivedAnimations) {
      setFriendsData({});
      return;
    }
    
    const friendUids = Object.keys(userData.receivedAnimations);
    if (friendUids.length === 0) {
      setFriendsData({});
      return;
    }

    try {
      // Create the function call inside the callback
      const getFriendDetailsFunction = httpsCallable(functions, 'getFriendDetails');
      const result = await getFriendDetailsFunction({ 
        friendUids: friendUids 
      });
      
      const friendsWithDetails = {};
      Object.entries(userData.receivedAnimations).forEach(([uid, animation]) => {
        const friendData = result.data.friendDetails[uid];
        if (friendData) {
          friendsWithDetails[uid] = {
            displayName: friendData.displayName || friendData.email || 'Unknown User',
            email: friendData.email || '',
            uid
          };
        } else {
          friendsWithDetails[uid] = {
            displayName: 'Unknown User',
            email: '',
            uid
          };
        }
      });
      
      setFriendsData(friendsWithDetails);
    } catch (error) {
      console.error('Error loading friend details:', error);
      // Create fallback friend data
      const fallbackFriends = {};
      Object.keys(userData.receivedAnimations).forEach((uid) => {
        fallbackFriends[uid] = {
          displayName: 'Unknown User',
          email: '',
          uid
        };
      });
      setFriendsData(fallbackFriends);
    }
  }, [userData?.receivedAnimations, functions]); // Only depend on userData.receivedAnimations and functions

  // Load friends data - now with stable function reference
  useEffect(() => {
    loadFriendsData();
  }, [loadFriendsData]);

  // Update current animation when selection changes
  useEffect(() => {
    if (selectedAnimation === 'personal') {
      setCurrentAnimation(userData?.myAnimation || null);
    } else {
      setCurrentAnimation(userData?.receivedAnimations?.[selectedAnimation] || null);
    }
  }, [selectedAnimation, userData]);

  const handleAnimationChange = (e) => {
    setSelectedAnimation(e.target.value);
  };

  const getAnimationSource = () => {
    if (selectedAnimation === 'personal') {
      return 'Your Personal Animation';
    } else {
      const friend = friendsData[selectedAnimation];
      return `From: ${friend?.displayName || 'Loading...'}`;
    }
  };

  const handleDoubleClick = () => {
    if (currentAnimation) {
      setIsFullscreen(true);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  if (!userData) {
    return (
      <div className="text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Single Animation Selector */}
        <div className="card bg-base-200 p-4">
          <h3 className="text-lg font-semibold mb-4 text-center">Animation Player</h3>
          
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text">Select Animation:</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={selectedAnimation}
                onChange={handleAnimationChange}
              >
                <option value="personal">🎨 My Personal Animation</option>
                {Object.entries(userData?.receivedAnimations || {}).map(([uid, animation]) => {
                  const friend = friendsData[uid];
                  return (
                    <option key={uid} value={uid}>
                      👤 {friend?.displayName || `Friend ${uid.slice(0, 8)}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="badge badge-primary badge-lg">
              {getAnimationSource()}
            </div>
          </div>
        </div>

        {/* Animation Player */}
        <div className="flex justify-center">
          {currentAnimation ? (
            <div 
              className="w-full max-w-md cursor-pointer"
              onDoubleClick={handleDoubleClick}
            >
              <AutoPlayAnimationPlayer 
                animation={currentAnimation}
                size="large"
                fullscreen={false}
              />
              <div className="text-center mt-2">
                <div className="text-xs text-base-content/50">
                  Double-click for fullscreen
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-base-200 p-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-lg font-semibold mb-2">No Animation Available</h3>
                <p className="text-base-content/70">
                  {selectedAnimation === 'personal' 
                    ? 'Create your personal animation in the Animations section'
                    : 'No animations received from friends yet'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && currentAnimation && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{currentAnimation.name}</h3>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={closeFullscreen}
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center">
              <AutoPlayAnimationPlayer 
                animation={currentAnimation}
                size="large"
                fullscreen={true}
              />
            </div>
            <div className="text-center mt-4 text-base-content/70">
              <div className="badge badge-primary">
                {getAnimationSource()}
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeFullscreen}></div>
        </div>
      )}
    </>
  );
}
