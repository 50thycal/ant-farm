'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GameState,
  createInitialGameState,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CELL_SIZE,
} from '../game/types';
import { simulateStep, addFood, digAt } from '../game/simulation';
import { render } from '../game/renderer';

export default function AntFarm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tool, setTool] = useState<'none' | 'food' | 'dig'>('none');
  const [stats, setStats] = useState({ ants: 0, food: 0, stored: 0 });

  // Initialize game state
  useEffect(() => {
    gameStateRef.current = createInitialGameState();
    updateStats();
  }, []);

  // Update stats display
  const updateStats = useCallback(() => {
    if (gameStateRef.current) {
      setStats({
        ants: gameStateRef.current.ants.length,
        food: gameStateRef.current.food.length,
        stored: gameStateRef.current.colony.foodStored,
      });
    }
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!gameStateRef.current) return;

      // Calculate delta time
      const deltaTime = timestamp - lastTimeRef.current;

      // Run simulation at ~60fps
      if (deltaTime > 16) {
        lastTimeRef.current = timestamp;

        // Update game state
        gameStateRef.current.paused = isPaused;
        gameStateRef.current.speed = speed;
        simulateStep(gameStateRef.current);

        // Render
        render(ctx, gameStateRef.current);

        // Update stats every 30 frames
        if (gameStateRef.current.tick % 30 === 0) {
          updateStats();
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPaused, speed, updateStats]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameStateRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = ((e.clientX - rect.left) * scaleX) / CELL_SIZE;
      const y = ((e.clientY - rect.top) * scaleY) / CELL_SIZE;

      if (tool === 'food') {
        addFood(gameStateRef.current, x, y);
      } else if (tool === 'dig') {
        digAt(gameStateRef.current, x, y);
      }
    },
    [tool]
  );

  // Reset game
  const handleReset = useCallback(() => {
    gameStateRef.current = createInitialGameState();
    updateStats();
  }, [updateStats]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-amber-800">🐜 Ant Farm</h1>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        className="border-4 border-amber-800 rounded-lg shadow-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2">
        {/* Tool buttons */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTool('none')}
            className={`px-3 py-2 rounded ${
              tool === 'none' ? 'bg-amber-500 text-white' : 'bg-white'
            }`}
          >
            👆 Select
          </button>
          <button
            onClick={() => setTool('food')}
            className={`px-3 py-2 rounded ${
              tool === 'food' ? 'bg-green-500 text-white' : 'bg-white'
            }`}
          >
            🍎 Food
          </button>
          <button
            onClick={() => setTool('dig')}
            className={`px-3 py-2 rounded ${
              tool === 'dig' ? 'bg-amber-700 text-white' : 'bg-white'
            }`}
          >
            ⛏️ Dig
          </button>
        </div>

        {/* Speed controls */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-2 rounded ${
              isPaused ? 'bg-red-500 text-white' : 'bg-white'
            }`}
          >
            {isPaused ? '▶️ Play' : '⏸️ Pause'}
          </button>
          <button
            onClick={() => setSpeed(1)}
            className={`px-3 py-2 rounded ${
              speed === 1 && !isPaused ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            1x
          </button>
          <button
            onClick={() => setSpeed(2)}
            className={`px-3 py-2 rounded ${
              speed === 2 ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            2x
          </button>
          <button
            onClick={() => setSpeed(4)}
            className={`px-3 py-2 rounded ${
              speed === 4 ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            4x
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          🔄 Reset
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>🐜 Ants: {stats.ants}</span>
        <span>🍎 Food on ground: {stats.food}</span>
        <span>📦 Food stored: {stats.stored}</span>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-md">
        <p>Click on the ground to place food or dig tunnels.</p>
        <p>Ants will explore, dig tunnels, and collect food!</p>
      </div>
    </div>
  );
}
