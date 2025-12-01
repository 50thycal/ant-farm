/**
 * Pheromone system for ant communication
 * Handles decay and diffusion of pheromone trails
 */

import type { GameState } from './gameState';
import { WORLD_WIDTH, WORLD_HEIGHT } from './gameState';
import { getCell } from './world';

// Pheromone constants
const DECAY_RATE = 0.5; // pheromone decay per second
const DIFFUSION_FACTOR = 0.2; // how much pheromones spread to neighbors

/**
 * Update pheromone fields: apply decay and diffusion
 */
export function updatePheromones(gameState: GameState, dt: number): void {
  const { world } = gameState;

  // Create scratch arrays for diffusion calculation
  const newFoodPheromones = new Float32Array(world.cells.length);
  const newHomePheromones = new Float32Array(world.cells.length);

  // Copy current values and apply decay
  for (let i = 0; i < world.cells.length; i++) {
    const cell = world.cells[i];
    // Decay toward 0
    cell.pheromoneFood = Math.max(0, cell.pheromoneFood - DECAY_RATE * dt);
    cell.pheromoneHome = Math.max(0, cell.pheromoneHome - DECAY_RATE * dt);

    newFoodPheromones[i] = cell.pheromoneFood;
    newHomePheromones[i] = cell.pheromoneHome;
  }

  // Apply diffusion (simple 4-neighbor blur)
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const idx = y * WORLD_WIDTH + x;
      const cell = world.cells[idx];

      // Sample 4 neighbors
      const neighbors = [
        getCell(world, x + 1, y),
        getCell(world, x - 1, y),
        getCell(world, x, y + 1),
        getCell(world, x, y - 1),
      ];

      // Calculate average for food pheromone
      let foodSum = cell.pheromoneFood;
      let foodCount = 1;

      // Calculate average for home pheromone
      let homeSum = cell.pheromoneHome;
      let homeCount = 1;

      for (const neighbor of neighbors) {
        if (neighbor) {
          foodSum += neighbor.pheromoneFood;
          foodCount++;
          homeSum += neighbor.pheromoneHome;
          homeCount++;
        }
      }

      const foodAvg = foodSum / foodCount;
      const homeAvg = homeSum / homeCount;

      // Move toward average (diffusion)
      newFoodPheromones[idx] =
        cell.pheromoneFood +
        (foodAvg - cell.pheromoneFood) * DIFFUSION_FACTOR * dt;
      newHomePheromones[idx] =
        cell.pheromoneHome +
        (homeAvg - cell.pheromoneHome) * DIFFUSION_FACTOR * dt;
    }
  }

  // Write back diffused values
  for (let i = 0; i < world.cells.length; i++) {
    world.cells[i].pheromoneFood = Math.max(0, Math.min(1, newFoodPheromones[i]));
    world.cells[i].pheromoneHome = Math.max(0, Math.min(1, newHomePheromones[i]));
  }
}

/**
 * Deposit food pheromone at a location
 */
export function depositFoodPheromone(
  gameState: GameState,
  x: number,
  y: number,
  amount: number
): void {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const cell = getCell(gameState.world, cellX, cellY);
  if (cell) {
    cell.pheromoneFood = Math.min(1, cell.pheromoneFood + amount);
  }
}

/**
 * Deposit home pheromone at a location
 */
export function depositHomePheromone(
  gameState: GameState,
  x: number,
  y: number,
  amount: number
): void {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const cell = getCell(gameState.world, cellX, cellY);
  if (cell) {
    cell.pheromoneHome = Math.min(1, cell.pheromoneHome + amount);
  }
}
