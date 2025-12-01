'use client';

/**
 * ControlsPanel component
 * UI controls for the ant farm simulation
 */

import type { GameState } from '../sim/gameState';

interface ControlsPanelProps {
  gameState?: GameState;
}

export function ControlsPanel({ gameState }: ControlsPanelProps) {
  const handleAddFood = () => {
    const api = (window as any).antFarmAPI;
    if (!api) return;

    const state = api.getGameState();
    // Add food at a default position (center-top area)
    state.foodItems.push({
      x: state.world.width / 2 + (Math.random() - 0.5) * 10,
      y: 5 + Math.random() * 5,
    });
    api.setGameState(state);
  };

  const handleAddWater = () => {
    const api = (window as any).antFarmAPI;
    if (!api) return;

    const state = api.getGameState();
    // Add water at a default position (center-top area)
    state.waterItems.push({
      x: state.world.width / 2 + (Math.random() - 0.5) * 10,
      y: 5 + Math.random() * 5,
    });
    api.setGameState(state);
  };

  const handleAddDirt = () => {
    const api = (window as any).antFarmAPI;
    if (!api) return;

    // Placeholder for PR-003 (adding dirt blocks)
    alert('Add dirt functionality coming in PR-003!');
  };

  const handleReset = () => {
    if (confirm('Reset the ant farm? This will clear all progress.')) {
      const api = (window as any).antFarmAPI;
      if (api) {
        api.resetGame();
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    const api = (window as any).antFarmAPI;
    if (!api) return;

    const state = api.getGameState();
    state.settings.simSpeed = speed;
    api.setGameState(state);
  };

  return (
    <div
      style={{
        padding: '1rem',
        borderTop: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Resource Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={handleAddFood}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          + Food
        </button>
        <button
          onClick={handleAddWater}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          + Water
        </button>
        <button
          onClick={handleAddDirt}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#8b4513',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          + Dirt
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      {/* Sim Speed Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Speed:</span>
        <button
          onClick={() => handleSpeedChange(0)}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor:
              gameState?.settings.simSpeed === 0 ? '#333' : '#ddd',
            color: gameState?.settings.simSpeed === 0 ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Pause
        </button>
        <button
          onClick={() => handleSpeedChange(1)}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor:
              gameState?.settings.simSpeed === 1 ? '#333' : '#ddd',
            color: gameState?.settings.simSpeed === 1 ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Normal
        </button>
        <button
          onClick={() => handleSpeedChange(2)}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor:
              gameState?.settings.simSpeed === 2 ? '#333' : '#ddd',
            color: gameState?.settings.simSpeed === 2 ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Fast
        </button>
      </div>

      {/* Stats Display */}
      {gameState && (
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span>Ants: {gameState.ants.length}</span>
          <span>Food: {gameState.foodItems.length}</span>
          <span>Water: {gameState.waterItems.length}</span>
          <span>Stored Food: {gameState.colony.foodStored}</span>
        </div>
      )}
    </div>
  );
}
