// src/components/AnimationSender.jsx
import React, { useState } from 'react';
import AnimationCreator from './AnimationCreator';

export default function AnimationSender({ friends, onClose }) {
  const [selectedFriend, setSelectedFriend] = useState('');
  const [showCreator, setShowCreator] = useState(false);

  const handleFriendSelect = (friendUid) => {
    setSelectedFriend(friendUid);
    setShowCreator(true);
  };

  const handleAnimationSent = () => {
    setShowCreator(false);
    setSelectedFriend('');
    if (onClose) onClose();
  };

  if (showCreator && selectedFriend) {
    return (
      <AnimationCreator
        isPersonal={false}
        targetFriendUid={selectedFriend}
        onClose={handleAnimationSent}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select a friend to send animation to:</h3>
      
      {Object.keys(friends).length === 0 ? (
        <p className="text-base-content/70">
          Add some friends first to send animations!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(friends).map(([uid, friend]) => (
            <div 
              key={uid}
              className="card bg-base-200 p-4 cursor-pointer hover:bg-base-300 transition-colors"
              onClick={() => handleFriendSelect(uid)}
            >
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-10">
                    <span className="text-sm">
                      {(friend.displayName || friend.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-medium">{friend.displayName || friend.email}</div>
                  <div className="text-sm text-base-content/70">{friend.email}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button className="btn btn-outline w-full" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
