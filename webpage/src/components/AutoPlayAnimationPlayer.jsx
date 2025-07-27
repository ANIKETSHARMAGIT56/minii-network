// src/components/AutoPlayAnimationPlayer.jsx
import React, { useState, useEffect } from 'react';

export default function AutoPlayAnimationPlayer({ 
  animation, 
  size = 'medium', 
  showControls = false, 
  fullscreen = false 
}) {
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

  // Auto-play animation
  useEffect(() => {
    if (!animation?.frames || animation.frames.length === 0) return;

    // Start auto-play immediately
    let frameIndex = 0;
    const interval = setInterval(() => {
      setCurrentFrame(frameIndex);
      frameIndex = (frameIndex + 1) % animation.frames.length;
    }, animation.frameDuration || 500);
    
    setPlayInterval(interval);

    // Cleanup interval on unmount or animation change
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [animation]);

  // Cleanup interval on unmount
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
        
        {/* LED Animation Grid */}
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

        {showControls && (
          <div className="flex flex-col items-center gap-2 mt-3">
            <div className="text-xs text-base-content/70">
              Frame {currentFrame + 1} of {animation.frames.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
