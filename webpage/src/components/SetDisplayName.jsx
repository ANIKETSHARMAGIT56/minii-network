// src/components/SetDisplayName.jsx
import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';

export default function SetDisplayName({ onComplete }) {
  const [displayName, setDisplayName] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [error, setError] = useState('');
  const [setting, setSetting] = useState(false);
  const currentUser = auth.currentUser;

  const functions = getFunctions();
  const checkDisplayNameFunction = httpsCallable(functions, 'checkDisplayNameAvailable');
  const setDisplayNameFunction = httpsCallable(functions, 'setDisplayName');

  // Debounced availability check
  useEffect(() => {
    if (!displayName || displayName.length < 2) {
      setAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setChecking(true);
      setError('');
      
      try {
        const result = await checkDisplayNameFunction({ displayName: displayName.trim() });
        setAvailable(result.data.available);
      } catch (error) {
        console.error('Error checking display name:', error);
        setError('Error checking availability');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [displayName, checkDisplayNameFunction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim() || displayName.length < 2) {
      setError('Display name must be at least 2 characters long');
      return;
    }

    if (!available) {
      setError('Please choose an available display name');
      return;
    }

    setSetting(true);
    setError('');

    try {
      await setDisplayNameFunction({ displayName: displayName.trim() });
      onComplete(); // Callback to refresh user data
    } catch (error) {
      console.error('Error setting display name:', error);
      switch (error.code) {
        case 'functions/already-exists':
          setError('Display name is already taken');
          setAvailable(false);
          break;
        case 'functions/invalid-argument':
          setError(error.message);
          break;
        default:
          setError('Failed to set display name. Please try again.');
      }
    } finally {
      setSetting(false);
    }
  };

  const getAvailabilityIndicator = () => {
    if (!displayName || displayName.length < 2) return null;
    if (checking) return <span className="loading loading-spinner loading-xs"></span>;
    if (available === true) return <span className="text-success">✓ Available</span>;
    if (available === false) return <span className="text-error">✗ Taken</span>;
    return null;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-100">
      <div className="card w-96 shadow-2xl bg-base-200">
        <form className="card-body" onSubmit={handleSubmit}>
          <h2 className="card-title mb-4 text-center">Set Your Display Name</h2>
          
          <p className="text-center text-base-content/70 mb-4">
            Choose a unique display name that your friends will see
          </p>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Display Name</span>
            </label>
            <input
              type="text"
              placeholder="Enter display name"
              className={`input input-bordered w-full ${
                available === false ? 'input-error' : 
                available === true ? 'input-success' : ''
              }`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              required
            />
            <label className="label">
              <span className="label-text-alt">
                {getAvailabilityIndicator()}
              </span>
              <span className="label-text-alt">
                {displayName.length}/20
              </span>
            </label>
          </div>

          {error && (
            <div className="alert alert-error mt-2">
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className={`btn btn-primary mt-4 w-full ${setting ? 'loading' : ''}`}
            disabled={setting || !available || displayName.length < 2}
          >
            {setting ? 'Setting...' : 'Set Display Name'}
          </button>

          <div className="text-xs text-center text-base-content/50 mt-2">
            Your display name must be unique and can be 2-20 characters long
          </div>
        </form>
      </div>
    </div>
  );
}
