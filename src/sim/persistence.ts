/**
 * Game state persistence via localStorage
 * Phase 1: Client-side only
 */

import type { GameState } from './gameState';
import { createInitialGameState } from './gameState';

const STORAGE_KEY = 'antfarm-001-state-v2'; // v2: Added state machine fields

/**
 * Save game state to localStorage
 */
export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  try {
    const json = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    console.error('Failed to save game state:', err);
  }
}

/**
 * Load game state from localStorage
 * Falls back to initial state if save is missing or invalid
 */
export function loadGameState(): GameState {
  if (typeof window === 'undefined') {
    return createInitialGameState();
  }

  try {
    const json = window.localStorage.getItem(STORAGE_KEY);
    if (!json) {
      return createInitialGameState();
    }

    const parsed = JSON.parse(json);

    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid save data, using fresh state');
      return createInitialGameState();
    }

    // Hydrate any missing fields with defaults
    return hydrateGameState(parsed);
  } catch (err) {
    console.error('Failed to load game state, using default:', err);
    return createInitialGameState();
  }
}

/**
 * Clear saved game state
 */
export function clearSavedState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear saved state:', err);
  }
}

/**
 * Hydrate loaded state with any missing fields
 * Ensures backwards compatibility when adding new fields
 */
function hydrateGameState(partial: any): GameState {
  const defaults = createInitialGameState();

  // Migrate ants to ensure they have new state machine fields
  const ants = (partial.ants || defaults.ants).map((ant: any) => ({
    ...ant,
    // Add new state machine fields if missing
    mode: ant.mode || 'idleSurface',
    hasDirt: ant.hasDirt !== undefined ? ant.hasDirt : false,
    homeColumn: ant.homeColumn !== undefined ? ant.homeColumn : Math.floor(ant.x || 0),
  }));

  return {
    meta: partial.meta || defaults.meta,
    world: partial.world || defaults.world,
    colony: {
      ...defaults.colony,
      ...partial.colony,
    },
    ants,
    particles: partial.particles || [],
    foodItems: partial.foodItems || [],
    waterItems: partial.waterItems || [],
    settings: {
      ...defaults.settings,
      ...partial.settings,
    },
  };
}
