'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  SandboxState,
  createFilledSandbox,
  createSandbox,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CELL_SIZE,
} from './types';
import { simulateStep, addSand, removeSand } from './simulation';
import { render } from './renderer';

export default function Sandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SandboxState | null>(null);
  const animationRef = useRef<number>(0);
  const [isRunning, setIsRunning] = useState(true);
  const [tool, setTool] = useState<'add' | 'remove' | 'marker'>('add');

  // Initialize
  useEffect(() => {
    stateRef.current = createFilledSandbox();
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    const gameLoop = (timestamp: number) => {
      if (!stateRef.current) return;

      const delta = timestamp - lastTime;

      if (delta >= frameTime) {
        lastTime = timestamp;

        // Run simulation
        if (isRunning) {
          // Multiple simulation steps per frame for faster settling
          for (let i = 0; i < 3; i++) {
            simulateStep(stateRef.current);
          }
        }

        // Render
        render(ctx, stateRef.current);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning]);

  // Get coordinates from mouse or touch event
  const getCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((clientX - rect.left) * scaleX) / CELL_SIZE);
    const y = Math.floor(((clientY - rect.top) * scaleY) / CELL_SIZE);

    return { x, y };
  }, []);

  // Apply tool at coordinates
  const applyTool = useCallback((x: number, y: number) => {
    if (!stateRef.current) return;

    if (tool === 'add') {
      addSand(stateRef.current, x, y, 4);
    } else if (tool === 'remove') {
      removeSand(stateRef.current, x, y, 4);
    } else if (tool === 'marker') {
      // Toggle marker: if clicking near existing marker, remove it; otherwise place new one
      const state = stateRef.current;
      if (state.marker) {
        const dx = Math.abs(state.marker.x - x);
        const dy = Math.abs(state.marker.y - y);
        if (dx < 5 && dy < 5) {
          // Close to existing marker, remove it
          state.marker = null;
          return;
        }
      }
      // Place new marker
      state.marker = { x, y };
    }
  }, [tool]);

  // Handle mouse/touch drag state
  const [isPointerDown, setIsPointerDown] = useState(false);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsPointerDown(true);
      const coords = getCoords(e.clientX, e.clientY);
      if (coords) applyTool(coords.x, coords.y);
    },
    [getCoords, applyTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPointerDown) {
        const coords = getCoords(e.clientX, e.clientY);
        if (coords) applyTool(coords.x, coords.y);
      }
    },
    [isPointerDown, getCoords, applyTool]
  );

  const handleMouseUp = useCallback(() => {
    setIsPointerDown(false);
  }, []);

  // Touch handlers - allow scrolling, only prevent when actively using sand tools
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      // Only preventDefault for add/remove tools to allow scrolling with marker tool
      if (tool === 'add' || tool === 'remove') {
        e.preventDefault();
      }
      setIsPointerDown(true);
      const touch = e.touches[0];
      const coords = getCoords(touch.clientX, touch.clientY);
      if (coords) applyTool(coords.x, coords.y);
    },
    [getCoords, applyTool, tool]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      // Only preventDefault when actively dragging with sand tools
      if (isPointerDown && (tool === 'add' || tool === 'remove')) {
        e.preventDefault();
        const touch = e.touches[0];
        const coords = getCoords(touch.clientX, touch.clientY);
        if (coords) applyTool(coords.x, coords.y);
      }
    },
    [isPointerDown, getCoords, applyTool, tool]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPointerDown(false);
  }, []);

  // Reset functions
  const resetEmpty = useCallback(() => {
    stateRef.current = createSandbox();
  }, []);

  const resetFilled = useCallback(() => {
    stateRef.current = createFilledSandbox();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-amber-700">Sand Box</h1>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="border-4 border-amber-800 rounded-lg shadow-xl cursor-crosshair select-none"
        style={{
          maxWidth: '100%',
          height: 'auto',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
        }}
      />

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2">
        {/* Tools */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTool('add')}
            className={`px-3 py-2 rounded transition ${
              tool === 'add' ? 'bg-amber-500 text-white' : 'bg-white hover:bg-gray-50'
            }`}
          >
            + Add Sand
          </button>
          <button
            onClick={() => setTool('remove')}
            className={`px-3 py-2 rounded transition ${
              tool === 'remove' ? 'bg-red-500 text-white' : 'bg-white hover:bg-gray-50'
            }`}
          >
            - Remove
          </button>
          <button
            onClick={() => setTool('marker')}
            className={`px-3 py-2 rounded transition ${
              tool === 'marker' ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-50'
            }`}
          >
            🎯 Marker
          </button>
        </div>

        {/* Playback */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-2 rounded transition ${
              isRunning ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
            }`}
          >
            {isRunning ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>

        {/* Reset */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={resetEmpty}
            className="px-3 py-2 rounded bg-white hover:bg-gray-50 transition"
          >
            Empty
          </button>
          <button
            onClick={resetFilled}
            className="px-3 py-2 rounded bg-white hover:bg-gray-50 transition"
          >
            Refill
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Click and drag to add or remove sand. Use marker tool to guide the ant! 🎯
      </p>
    </div>
  );
}
