/**
 * Main simulation step function
 * Called each animation frame to update game state
 */

import type { GameState, Ant } from './gameState';
import { WORLD_WIDTH, WORLD_HEIGHT, SOIL_START_Y } from './gameState';
import {
  getCell,
  setCellToAir,
  setCellToDirt,
} from './world';
import {
  updatePheromones,
} from './pheromones';

// All old physics constants commented out - state machine doesn't use them
// const GRAVITY = 30;
// const MAX_SPEED = 15;
// const WANDER_FORCE = 20;
// const FOOD_SEEK_THRESHOLD = 0.7;
// const FOOD_EAT_RADIUS = 0.5;
// const PHEROMONE_DEPOSIT_RATE = 0.6;
// const PHEROMONE_FOLLOW_THRESHOLD = 0.1;
// const PHEROMONE_FOLLOW_FORCE = WANDER_FORCE * 1.5;

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
    updateAnt(ant, gameState, effectiveDt);
  }

  // Update dirt particles
  updateDirtParticles(gameState, effectiveDt);

  // Update pheromones (decay and diffusion)
  updatePheromones(gameState, effectiveDt);
}

// Old helper functions - not used by state machine
// (commented out to avoid unused function errors)

/**
 * Helper: clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Find Y coordinate to drop dirt on surface at column x
 * Returns first air cell above soil/mound, or -1 if none
 */
function findSurfaceDropY(world: any, x: number): number {
  // Scan from surface upward to find first air cell
  for (let y = SOIL_START_Y - 1; y >= 0; y--) {
    const cell = getCell(world, x, y);
    if (!cell) continue;
    if (cell.type === 'air') {
      return y; // Place dirt here
    }
  }
  return -1; // No air available
}

/**
 * STATE: idleSurface - ant walks on surface, occasionally starts digging
 */
function updateIdleSurface(ant: Ant, world: any, dt: number): void {
  const SPEED = 20 * dt; // Increased from 4 for more visible movement

  // Simple left/right wobble on surface
  ant.x += (Math.random() < 0.5 ? -1 : 1) * SPEED;
  ant.x = clamp(ant.x, 0.5, WORLD_WIDTH - 0.5);
  ant.y = SOIL_START_Y - 0.5; // Stay at surface

  // Occasionally decide to start/continue shaft at current column
  const col = Math.floor(ant.x);
  const belowCell = getCell(world, col, SOIL_START_Y);

  const canDigHere = belowCell && (belowCell.type === 'dirt' || belowCell.type === 'stone');
  const START_DIG_CHANCE = 0.02; // 2% chance per frame (not scaled by dt)

  if (canDigHere && Math.random() < START_DIG_CHANCE) {
    ant.homeColumn = col;
    ant.mode = 'diggingDown';
    ant.y = SOIL_START_Y - 0.5; // Position at surface
  }
}

/**
 * STATE: diggingDown - ant moves down shaft until hitting dirt, then digs
 */
function updateDiggingDown(ant: Ant, world: any, dt: number): void {
  const SPEED = 30 * dt; // Increased from 6 for faster digging

  // Stay centered in shaft
  ant.x = ant.homeColumn + 0.5;

  // Move down
  ant.y += SPEED;

  const cellX = ant.homeColumn;
  const cellY = Math.floor(ant.y + 0.5);

  // Stop at bottom of world
  if (cellY >= WORLD_HEIGHT - 1) {
    ant.mode = 'carryingUp';
    return;
  }

  // Check if we hit dirt
  const cell = getCell(world, cellX, cellY);
  if (cell && (cell.type === 'dirt' || cell.type === 'stone')) {
    // Dig this cell
    setCellToAir(world, cellX, cellY);
    ant.hasDirt = true;
    ant.carrying = 'dirt'; // For visual indicator

    // Position ant in the newly dug space
    ant.y = cellY - 0.5;
    ant.mode = 'carryingUp';
  }
}

/**
 * STATE: carryingUp - ant climbs straight up shaft with dirt
 */
function updateCarryingUp(ant: Ant, _world: any, dt: number): void {
  const CLIMB_SPEED = 30 * dt; // Increased from 6 for faster climbing

  // Stay centered in shaft
  ant.x = ant.homeColumn + 0.5;

  // Move up
  ant.y -= CLIMB_SPEED;

  // Check if reached surface
  if (ant.y < SOIL_START_Y - 0.5) {
    ant.mode = 'carryingSurface';
    ant.y = SOIL_START_Y - 0.5;
  }
}

/**
 * STATE: carryingSurface - ant walks on surface with dirt, then drops it
 */
function updateCarryingSurface(ant: Ant, world: any, dt: number): void {
  const SPEED = 15 * dt; // Increased from 3

  // Stay at surface
  ant.y = SOIL_START_Y - 0.5;

  // Wander near home column (biased to stay nearby)
  const targetX = ant.homeColumn + 0.5;
  const bias = (targetX - ant.x) * 0.1;
  ant.x += bias + (Math.random() - 0.5) * SPEED;
  ant.x = clamp(ant.x, 0.5, WORLD_WIDTH - 0.5);

  // Random chance to drop dirt
  const DROP_CHANCE = 0.05; // 5% chance per frame (not scaled by dt)

  if (Math.random() < DROP_CHANCE) {
    const col = Math.floor(ant.x);

    // Skip if this would clog the tunnel entrance
    if (Math.abs(col - ant.homeColumn) < 1) {
      return; // Too close to entrance, keep carrying
    }

    const dropY = findSurfaceDropY(world, col);

    if (dropY >= 0) {
      setCellToDirt(world, col, dropY);
      ant.hasDirt = false;
      ant.carrying = 'none';
      // Immediately return to digging at home column instead of wandering
      ant.mode = 'diggingDown';
      ant.x = ant.homeColumn + 0.5;
      ant.y = SOIL_START_Y - 0.5;
    }
  }
}

/**
 * Update a single ant using simple state machine (no physics)
 */
function updateAnt(ant: Ant, gameState: GameState, dt: number): void {
  const { world } = gameState;

  // State machine - deterministic dig/carry/drop cycle
  switch (ant.mode) {
    case 'idleSurface':
      updateIdleSurface(ant, world, dt);
      break;
    case 'diggingDown':
      updateDiggingDown(ant, world, dt);
      break;
    case 'carryingUp':
      updateCarryingUp(ant, world, dt);
      break;
    case 'carryingSurface':
      updateCarryingSurface(ant, world, dt);
      break;
  }

  // Keep ants within world bounds
  ant.x = clamp(ant.x, 0.5, WORLD_WIDTH - 0.5);
  ant.y = clamp(ant.y, 0, WORLD_HEIGHT - 0.5);
}

/**
 * Update dirt particles (disabled for now - using simple state machine)
 */
function updateDirtParticles(_gameState: GameState, _dt: number): void {
  // Particle physics disabled - state machine handles dirt directly
}

// Old physics-based movement functions removed (not used by state machine)
