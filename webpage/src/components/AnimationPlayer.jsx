// src/components/AnimationPlayer.jsx
import React, { useState, useEffect } from 'react';

export default function AnimationPlayer({ animation, size = 'medium', showControls = true }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState(null);

  const sizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-6 h-6'
  };

  const containerSizes = {
    small: 'p-2',
    medium: 'p-3',
    large: 'p-4'
  };

  useEffect(() => {
    return () => {
      if (playInterval) clearInterval(playInterval);
    };
  }, [playInterval]);

  const playAnimation = () => {
    if (!animation?.frames || animation.frames.length === 0) return;

    if (isPlaying) {
      clearInterval(playInterval);
      setPlayInterval(null);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let frameIndex = 0;
      const interval = setInterval(() => {
        setCurrentFrame(frameIndex);
        frameIndex = (frameIndex + 1) % animation.frames.length;
      }, animation.frameDuration || 500);
      setPlayInterval(interval);
    }
  };

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
        
        {/* LED Animation Grid - NO TRANSITIONS */}
        <div className="flex justify-center">
          <div className={`inline-block bg-black rounded-lg ${containerSizes[size]}`}>
            <div className="grid grid-cols-8 gap-1">
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

        {showControls && (
          <div className="flex flex-col items-center gap-2 mt-3">
            <button 
              className="btn btn-primary btn-sm"
              onClick={playAnimation}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <div className="text-xs text-base-content/70">
              Frame {currentFrame + 1} of {animation.frames.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
