'use client';

/**
 * AntFarmCanvas component
 * Manages the canvas, animation loop, and game state updates
 */

import { useEffect, useRef } from 'react';
import {
  createInitialGameState,
  type GameState,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CELL_SIZE,
} from '../sim/gameState';
import { simulateStep } from '../sim/simulateStep';
import { drawGameState } from '../render/renderer';

const CANVAS_WIDTH = WORLD_WIDTH * CELL_SIZE;
const CANVAS_HEIGHT = WORLD_HEIGHT * CELL_SIZE;

interface AntFarmCanvasProps {
  onGameStateChange?: (gameState: GameState) => void;
}

export function AntFarmCanvas({ onGameStateChange }: AntFarmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialGameState());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  // Initialize game state
  useEffect(() => {
    // Try to load saved state from localStorage
    try {
      const saved = localStorage.getItem('antfarm-001-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        gameStateRef.current = parsed;
      }
    } catch (error) {
      console.warn('Failed to load saved game state:', error);
    }
  }, []);

  // Save game state periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      try {
        localStorage.setItem(
          'antfarm-001-state',
          JSON.stringify(gameStateRef.current)
        );
      } catch (error) {
        console.warn('Failed to save game state:', error);
      }
    }, 3000); // save every 3 seconds

    return () => clearInterval(saveInterval);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (currentTime: number) => {
      const dt = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0;
      lastTimeRef.current = currentTime;

      // Update simulation (mutates gameState in-place)
      simulateStep(gameStateRef.current, dt);

      // Render
      drawGameState(ctx, gameStateRef.current);

      // Notify parent of state change
      onGameStateChange?.(gameStateRef.current);

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onGameStateChange]);

  // Expose methods to parent (for controls)
  useEffect(() => {
    (window as any).antFarmAPI = {
      getGameState: () => gameStateRef.current,
      setGameState: (newState: GameState) => {
        gameStateRef.current = newState;
      },
      resetGame: () => {
        gameStateRef.current = createInitialGameState();
        localStorage.removeItem('antfarm-001-state');
      },
    };

    return () => {
      delete (window as any).antFarmAPI;
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: '1rem',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '2px solid #333',
          maxWidth: '100%',
          height: 'auto',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
