/**
 * Main simulation step function
 * Called each animation frame to update game state
 */

import type { GameState } from './gameState';
import { WORLD_WIDTH, WORLD_HEIGHT } from './gameState';

/**
 * Advance the simulation by one time step
 * @param gameState - current game state (mutated in-place)
 * @param dt - delta time in seconds
 */
export function simulateStep(gameState: GameState, dt: number): void {
  if (gameState.settings.simSpeed === 0) {
    return; // paused
  }

  // Respect sim speed setting
  const effectiveDt = dt * gameState.settings.simSpeed;

  // Update all ants
  for (const ant of gameState.ants) {
    updateAnt(ant, effectiveDt);
  }

  // PR-003 will add digging and particles
  // PR-004 will add pheromones
}

/**
 * Update a single ant with random wandering behavior
 */
function updateAnt(ant: any, dt: number): void {
  const MAX_SPEED = 15; // cells per second
  const WANDER_FORCE = 20; // random acceleration magnitude

  // Apply random wandering acceleration occasionally
  if (Math.random() < 0.1) {
    const angle = Math.random() * Math.PI * 2;
    ant.vx += Math.cos(angle) * WANDER_FORCE * dt;
    ant.vy += Math.sin(angle) * WANDER_FORCE * dt;
  }

  // Clamp velocity to max speed
  const speed = Math.sqrt(ant.vx * ant.vx + ant.vy * ant.vy);
  if (speed > MAX_SPEED) {
    ant.vx = (ant.vx / speed) * MAX_SPEED;
    ant.vy = (ant.vy / speed) * MAX_SPEED;
  }

  // Apply friction
  const friction = 0.95;
  ant.vx *= friction;
  ant.vy *= friction;

  // Update position
  ant.x += ant.vx * dt;
  ant.y += ant.vy * dt;

  // Keep ants within world bounds
  if (ant.x < 0) {
    ant.x = 0;
    ant.vx = Math.abs(ant.vx); // bounce
  }
  if (ant.x >= WORLD_WIDTH) {
    ant.x = WORLD_WIDTH - 0.1;
    ant.vx = -Math.abs(ant.vx); // bounce
  }
  if (ant.y < 0) {
    ant.y = 0;
    ant.vy = Math.abs(ant.vy); // bounce
  }
  if (ant.y >= WORLD_HEIGHT) {
    ant.y = WORLD_HEIGHT - 0.1;
    ant.vy = -Math.abs(ant.vy); // bounce
  }
}
