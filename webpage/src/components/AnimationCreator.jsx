// src/components/AnimationCreator.jsx
import React, { useState, useEffect } from 'react';
import { ref, set, get} from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';

export default function AnimationCreator({ isPersonal = true, targetFriendUid = null, onClose = null }) {
  const [frames, setFrames] = useState([Array(8).fill().map(() => Array(8).fill(0))]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationName, setAnimationName] = useState('');
  const [frameDuration, setFrameDuration] = useState(500);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState(null);
  const [saving, setSaving] = useState(false);
  const currentUser = auth.currentUser;

  // Initialize Cloud Functions
  const functions = getFunctions();
  const sendAnimationFunction = httpsCallable(functions, 'sendAnimation');

  useEffect(() => {
    if (isPersonal) {
      loadPersonalAnimation();
    }
  }, [isPersonal]);

  const loadPersonalAnimation = async () => {
    try {
      const snapshot = await get(ref(db, `users/${currentUser.uid}/myAnimation`));
      const animation = snapshot.val();
      if (animation) {
        setFrames(animation.frames || [Array(8).fill().map(() => Array(8).fill(0))]);
        setAnimationName(animation.name || '');
        setFrameDuration(animation.frameDuration || 500);
      }
    } catch (error) {
      console.error('Error loading animation:', error);
    }
  };

  const togglePixel = (frameIndex, row, col) => {
    const newFrames = [...frames];
    newFrames[frameIndex][row][col] = newFrames[frameIndex][row][col] === 0 ? 1 : 0;
    setFrames(newFrames);
  };

  const addFrame = () => {
    setFrames([...frames, Array(8).fill().map(() => Array(8).fill(0))]);
  };

  const removeFrame = (frameIndex) => {
    if (frames.length > 1) {
      const newFrames = frames.filter((_, index) => index !== frameIndex);
      setFrames(newFrames);
      if (currentFrame >= newFrames.length) {
        setCurrentFrame(newFrames.length - 1);
      }
    }
  };

  const duplicateFrame = (frameIndex) => {
    const newFrames = [...frames];
    newFrames.splice(frameIndex + 1, 0, [...frames[frameIndex].map(row => [...row])]);
    setFrames(newFrames);
  };

  const playAnimation = () => {
    if (isPlaying) {
      clearInterval(playInterval);
      setPlayInterval(null);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let frameIndex = 0;
      const interval = setInterval(() => {
        setCurrentFrame(frameIndex);
        frameIndex = (frameIndex + 1) % frames.length;
      }, frameDuration);
      setPlayInterval(interval);
    }
  };

  const saveAnimation = async () => {
    if (!animationName.trim()) {
      alert('Please enter an animation name');
      return;
    }

    if (frameDuration < 50 || frameDuration > 5000) {
      alert('Frame duration must be between 50ms and 5000ms');
      return;
    }

    setSaving(true);
    try {
      const animationData = {
        name: animationName,
        frames: frames,
        createdAt: Date.now(),
        frameDuration: frameDuration
      };

      if (isPersonal) {
        await set(ref(db, `users/${currentUser.uid}/myAnimation`), animationData);
        alert('Personal animation saved!');
      } else if (targetFriendUid) {
        await sendAnimationFunction({
          targetUid: targetFriendUid,
          animationData: animationData
        });
        alert('Animation sent to friend!');
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Error saving animation:', error);
      alert('Failed to save animation');
    } finally {
      setSaving(false);
    }
  };

  const clearFrame = () => {
    const newFrames = [...frames];
    newFrames[currentFrame] = Array(8).fill().map(() => Array(8).fill(0));
    setFrames(newFrames);
  };

  const durationPresets = [
    { label: 'Very Fast', value: 100, description: '0.1s' },
    { label: 'Fast', value: 250, description: '0.25s' },
    { label: 'Normal', value: 500, description: '0.5s' },
    { label: 'Slow', value: 1000, description: '1s' },
    { label: 'Very Slow', value: 2000, description: '2s' }
  ];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">
            {isPersonal ? 'My Personal Animation' : 'Send Animation to Friend'}
          </h2>
          {onClose && (
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          )}
        </div>

        {/* Animation Name */}
        <input
          type="text"
          placeholder="Animation name"
          className="input input-bordered w-full mb-4"
          value={animationName}
          onChange={(e) => setAnimationName(e.target.value)}
        />

        {/* Frame Duration Controls */}
        <div className="mb-4 p-4 bg-base-200 rounded-lg">
          <h3 className="font-semibold mb-3">Animation Speed</h3>
          
          {/* Duration Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {durationPresets.map((preset) => (
              <button
                key={preset.value}
                className={`btn btn-sm ${frameDuration === preset.value ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFrameDuration(preset.value)}
              >
                {preset.label}
                <span className="text-xs opacity-75">({preset.description})</span>
              </button>
            ))}
          </div>

          {/* Custom Duration Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Custom Duration (milliseconds)</span>
              <span className="label-text-alt">{frameDuration}ms = {(frameDuration / 1000).toFixed(2)}s per frame</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="50"
                max="3000"
                step="50"
                className="range range-primary flex-1"
                value={frameDuration}
                onChange={(e) => setFrameDuration(parseInt(e.target.value))}
              />
              <input
                type="number"
                min="50"
                max="5000"
                step="50"
                className="input input-bordered input-sm w-20"
                value={frameDuration}
                onChange={(e) => setFrameDuration(Math.max(50, Math.min(5000, parseInt(e.target.value) || 500)))}
              />
            </div>
            <div className="label">
              <span className="label-text-alt">Faster ← → Slower</span>
              <span className="label-text-alt">50ms - 5000ms</span>
            </div>
          </div>
        </div>

        {/* 8x8 LED Grid - NO TRANSITIONS */}
        <div className="mb-4">
          <div className="inline-block p-4 bg-black rounded-lg">
            <div className="grid grid-cols-8 gap-1">
              {frames[currentFrame]?.map((row, rowIndex) =>
                row.map((pixel, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-6 h-6 rounded-full ${
                      pixel 
                        ? 'bg-red-500 shadow-lg shadow-red-500/50' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                    onClick={() => togglePixel(currentFrame, rowIndex, colIndex)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Frame Controls */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button className="btn btn-sm" onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}>
            ←
          </button>
          <span className="badge">Frame {currentFrame + 1} of {frames.length}</span>
          <button className="btn btn-sm" onClick={() => setCurrentFrame(Math.min(frames.length - 1, currentFrame + 1))}>
            →
          </button>
        </div>

        {/* Animation Controls */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <button className="btn btn-success btn-sm" onClick={playAnimation}>
            {isPlaying ? 'Stop' : 'Play Preview'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={clearFrame}>
            Clear Frame
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => duplicateFrame(currentFrame)}>
            Duplicate Frame
          </button>
          <button className="btn btn-primary btn-sm" onClick={addFrame}>
            Add Frame
          </button>
          {frames.length > 1 && (
            <button className="btn btn-error btn-sm" onClick={() => removeFrame(currentFrame)}>
              Delete Frame
            </button>
          )}
        </div>

        {/* Preview Info */}
        {frames.length > 1 && (
          <div className="alert alert-info mb-4">
            <span>
              Animation: {frames.length} frames × {frameDuration}ms = {((frames.length * frameDuration) / 1000).toFixed(1)}s total loop time
            </span>
          </div>
        )}

        {/* Save Button */}
        <button 
          className={`btn btn-primary w-full ${saving ? 'loading' : ''}`}
          onClick={saveAnimation}
          disabled={saving}
        >
          {saving ? 'Saving...' : (isPersonal ? 'Save My Animation' : 'Send to Friend')}
        </button>
      </div>
    </div>
  );
}
