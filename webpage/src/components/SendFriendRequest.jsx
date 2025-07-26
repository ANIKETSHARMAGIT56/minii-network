// src/components/SendFriendRequest.jsx
import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';

export default function SendFriendRequest() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const currentUser = auth.currentUser;

  // Initialize Cloud Functions
  const functions = getFunctions();
  const sendFriendRequestFunction = httpsCallable(functions, 'sendFriendRequest');

  const sendFriendRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!displayName.trim()) {
        setError('Please enter a display name');
        return;
      }

      if (displayName.trim().length < 2) {
        setError('Display name must be at least 2 characters long');
        return;
      }

      if (displayName.trim().length > 20) {
        setError('Display name must be 20 characters or less');
        return;
      }

      // Call Cloud Function with display name
      const result = await sendFriendRequestFunction({ 
        targetDisplayName: displayName.trim()
      });
      
      setMessage(result.data.message);
      setDisplayName(''); // Clear the form on success
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      
      // Handle different error types from Cloud Functions
      switch (error.code) {
        case 'functions/not-found':
          setError('No user found with this display name');
          break;
        case 'functions/already-exists':
          setError(error.message); // "Already friends" or "Request already sent"
          break;
        case 'functions/invalid-argument':
          setError('You cannot send a friend request to yourself');
          break;
        case 'functions/unauthenticated':
          setError('You must be logged in to send friend requests');
          break;
        default:
          setError('Failed to send friend request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Send Friend Request</h2>
        <form onSubmit={sendFriendRequest}>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Friend's Display Name</span>
            </label>
            <input
              type="text"
              placeholder="Enter friend's display name"
              className="input input-bordered w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              maxLength={20}
              required
            />
            <label className="label">
              <span className="label-text-alt">
                Display names are case-insensitive
              </span>
              <span className="label-text-alt">
                {displayName.length}/20
              </span>
            </label>
          </div>
          
          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
          
          {message && (
            <div className="alert alert-success mt-4">
              <span>{message}</span>
            </div>
          )}
          
          <div className="card-actions justify-end mt-4">
            <button 
              type="submit" 
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              disabled={loading || displayName.trim().length < 2}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
