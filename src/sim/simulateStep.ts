/**
 * Main simulation step function
 * Called each animation frame to update game state
 */

import type { GameState } from './gameState';

/**
 * Advance the simulation by one time step
 * @param gameState - current game state
 * @param _dt - delta time in seconds (unused in PR-001, will be used in PR-002)
 * @returns updated game state
 */
export function simulateStep(gameState: GameState, _dt: number): GameState {
  if (gameState.settings.simSpeed === 0) {
    return gameState; // paused
  }

  // Respect sim speed setting
  // const effectiveDt = dt * gameState.settings.simSpeed;
  // Will be used in PR-002 for ant movement

  // For PR-001, this is just a stub
  // PR-002 will implement basic ant movement
  // PR-003 will add digging and particles
  // PR-004 will add pheromones

  return gameState;
}
