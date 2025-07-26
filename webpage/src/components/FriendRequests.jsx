// src/components/FriendRequests.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';
import SendFriendRequest from './SendFriendRequest';

export default function FriendRequests() {
  const [userFriendData, setUserFriendData] = useState({});
  const [friendsDetails, setFriendsDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  // Initialize Cloud Functions OUTSIDE of render cycle
  const functions = getFunctions();
  const acceptFriendRequestFunction = httpsCallable(functions, 'acceptFriendRequest');
  const rejectFriendRequestFunction = httpsCallable(functions, 'rejectFriendRequest');
  const removeFriendFunction = httpsCallable(functions, 'removeFriend');
  
  // Use useCallback to memoize the function reference
  const getFriendDetailsFunction = useCallback(() => {
    return httpsCallable(functions, 'getFriendDetails');
  }, [functions]);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to current user's data only
    const userRef = ref(db, `users/${currentUser.uid}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        setUserFriendData({
          friends: userData.friends || {},
          incomingFriendRequests: userData.incomingFriendRequests || {},
          outgoingFriendRequests: userData.outgoingFriendRequests || {}
        });
      }
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, [currentUser]);

  // Load friend details using Cloud Function when friend data changes
  useEffect(() => {
    const loadFriendDetails = async () => {
      const allUids = [
        ...Object.keys(userFriendData.friends || {}),
        ...Object.keys(userFriendData.incomingFriendRequests || {}),
        ...Object.keys(userFriendData.outgoingFriendRequests || {})
      ];

      const uniqueUids = [...new Set(allUids)];

      if (uniqueUids.length === 0) {
        setFriendsDetails({});
        return;
      }

      try {
        const friendDetailsFunc = getFriendDetailsFunction();
        const result = await friendDetailsFunc({ friendUids: uniqueUids });
        setFriendsDetails(result.data.friendDetails);
      } catch (error) {
        console.error('Error loading friend details:', error);
        setFriendsDetails({});
      }
    };

    if (Object.keys(userFriendData).length > 0) {
      loadFriendDetails();
    }
  }, [userFriendData, getFriendDetailsFunction]); // Now getFriendDetailsFunction is stable

  const handleAccept = async (requesterUid) => {
    try {
      await acceptFriendRequestFunction({ requesterUid });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request');
    }
  };

  const handleReject = async (requesterUid) => {
    try {
      await rejectFriendRequestFunction({ requesterUid });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (friendUid, friendName) => {
    try {
      const confirmed = window.confirm(
        `Are you sure you want to remove ${friendName} from your friends? This action cannot be undone.`
      );
      
      if (!confirmed) return;

      await removeFriendFunction({ friendUid });
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend. Please try again.');
    }
  };

  const handleCancelRequest = async () => {
    try {
      await rejectFriendRequestFunction({ requesterUid: currentUser.uid });
    } catch (error) {
      console.error('Error canceling friend request:', error);
      alert('Failed to cancel friend request');
    }
  };

  // Helper function to get display name with proper fallback
  const getDisplayName = (uid) => {
    const friend = friendsDetails[uid];
    if (friend?.displayName) return friend.displayName;
    if (friend?.email) return friend.email;
    return 'Loading...';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  // Prepare arrays for display
  const incomingRequests = Object.keys(userFriendData.incomingFriendRequests || {}).map(uid => ({
    uid,
    displayName: getDisplayName(uid),
    email: friendsDetails[uid]?.email || '',
    timestamp: userFriendData.incomingFriendRequests[uid]
  }));

  const outgoingRequests = Object.keys(userFriendData.outgoingFriendRequests || {}).map(uid => ({
    uid,
    displayName: getDisplayName(uid),
    email: friendsDetails[uid]?.email || '',
    timestamp: userFriendData.outgoingFriendRequests[uid]
  }));

  const friends = Object.keys(userFriendData.friends || {}).map(uid => ({
    uid,
    displayName: getDisplayName(uid),
    email: friendsDetails[uid]?.email || '',
    timestamp: userFriendData.friends[uid]
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <SendFriendRequest />

      {/* Current Friends */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Friends ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className="text-base-content/70">No friends yet. Send some friend requests!</p>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.uid} className="card bg-base-200 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10 h-10">
                          <span className="text-sm">
                            {friend.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{friend.displayName}</div>
                        <div className="text-sm text-base-content/70 truncate">{friend.email}</div>
                        <div className="text-xs text-base-content/50">
                          Friends since {friend.timestamp ? new Date(friend.timestamp).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <div className="badge badge-success">Friends</div>
                      <button 
                        className="btn btn-error btn-sm w-full sm:w-auto"
                        onClick={() => handleRemoveFriend(friend.uid, friend.displayName)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incoming Friend Requests */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Incoming Friend Requests ({incomingRequests.length})</h2>
          {incomingRequests.length === 0 ? (
            <p className="text-base-content/70">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.uid} className="card bg-base-200 p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                          <span className="text-sm">
                            {request.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{request.displayName}</div>
                        <div className="text-sm text-base-content/70 truncate">{request.email}</div>
                        <div className="text-xs text-base-content/50">
                          {request.timestamp ? new Date(request.timestamp).toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button 
                        className="btn btn-success btn-sm flex-1 sm:flex-none"
                        onClick={() => handleAccept(request.uid)}
                      >
                        Accept
                      </button>
                      <button 
                        className="btn btn-error btn-sm flex-1 sm:flex-none"
                        onClick={() => handleReject(request.uid)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outgoing Friend Requests */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Sent Friend Requests ({outgoingRequests.length})</h2>
          {outgoingRequests.length === 0 ? (
            <p className="text-base-content/70">No sent requests</p>
          ) : (
            <div className="space-y-3">
              {outgoingRequests.map((request) => (
                <div key={request.uid} className="card bg-base-200 p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="avatar placeholder">
                        <div className="bg-warning text-warning-content rounded-full w-10 h-10">
                          <span className="text-sm">
                            {request.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{request.displayName}</div>
                        <div className="text-sm text-base-content/70 truncate">{request.email}</div>
                        <div className="text-xs text-base-content/50">
                          Sent {request.timestamp ? new Date(request.timestamp).toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
                      <span className="badge badge-warning">Pending</span>
                      <button 
                        className="btn btn-outline btn-sm w-full sm:w-auto"
                        onClick={() => handleCancelRequest(request.uid)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
