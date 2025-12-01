/**
 * Main simulation step function
 * Called each animation frame to update game state
 */

import type { GameState, Ant } from './gameState';
import { WORLD_WIDTH, WORLD_HEIGHT } from './gameState';
import {
  getCell,
  setCellToAir,
  setCellToDirt,
  isSolidCell,
  isInNest,
} from './world';
import {
  updatePheromones,
  depositFoodPheromone,
  depositHomePheromone,
} from './pheromones';

// Physics constants
const GRAVITY = 30; // cells per second squared
const MAX_SPEED = 15; // cells per second
const WANDER_FORCE = 20; // random acceleration magnitude
const HUNGER_RATE = 0.02; // hunger increase per second (full in ~50 seconds)
const DIG_CHANCE_PER_SECOND = 0.5; // probability of digging when in dirt
const FOOD_SEEK_THRESHOLD = 0.7; // hunger level to start seeking food
const FOOD_EAT_RADIUS = 0.5; // distance to eat food

// Pheromone constants
const PHEROMONE_DEPOSIT_RATE = 0.6; // amount deposited per second
const PHEROMONE_FOLLOW_THRESHOLD = 0.1; // minimum pheromone to follow
const PHEROMONE_FOLLOW_FORCE = WANDER_FORCE * 1.5; // strength of pheromone following

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

/**
 * Update a single ant with wandering, digging, and food-seeking behavior
 */
function updateAnt(ant: Ant, gameState: GameState, dt: number): void {
  const { world, foodItems } = gameState;

  // Increase hunger over time
  ant.hunger = Math.min(1, ant.hunger + HUNGER_RATE * dt);

  // Check current cell for digging
  const cellX = Math.floor(ant.x);
  const cellY = Math.floor(ant.y);
  const cell = getCell(world, cellX, cellY);

  // Digging behavior: convert dirt to air and spawn particle
  if (
    cell &&
    cell.type === 'dirt' &&
    cellY > WORLD_HEIGHT * 0.2 // don't dig near surface
  ) {
    const digChance = DIG_CHANCE_PER_SECOND * dt;
    if (Math.random() < digChance) {
      setCellToAir(world, cellX, cellY);
      // Spawn dirt particle at cell center
      gameState.particles.push({
        x: cellX + 0.5,
        y: cellY + 0.5,
        vx: (Math.random() - 0.5) * 5, // small random horizontal velocity
        vy: -5, // initial upward velocity
      });
    }
  }

  // Movement behavior
  if (ant.hunger > FOOD_SEEK_THRESHOLD && foodItems.length > 0) {
    // Food-seeking behavior with pheromone following
    seekFood(ant, foodItems, dt, world);
  } else {
    // Random wandering
    randomWander(ant, dt);
  }

  // Apply friction
  const friction = 0.95;
  ant.vx *= friction;
  ant.vy *= friction;

  // Clamp velocity to max speed
  const speed = Math.sqrt(ant.vx * ant.vx + ant.vy * ant.vy);
  if (speed > MAX_SPEED) {
    ant.vx = (ant.vx / speed) * MAX_SPEED;
    ant.vy = (ant.vy / speed) * MAX_SPEED;
  }

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

  // Deposit pheromones
  depositPheromones(ant, gameState, dt);

  // Check for food consumption
  checkFoodConsumption(ant, gameState);
}

/**
 * Apply random wandering acceleration
 */
function randomWander(ant: Ant, dt: number): void {
  // Apply random wandering acceleration occasionally
  if (Math.random() < 0.1) {
    const angle = Math.random() * Math.PI * 2;
    ant.vx += Math.cos(angle) * WANDER_FORCE * dt;
    ant.vy += Math.sin(angle) * WANDER_FORCE * dt;
  }
}

/**
 * Seek nearest food item (with pheromone gradient following)
 */
function seekFood(
  ant: Ant,
  foodItems: any[],
  dt: number,
  world: any
): void {
  const cellX = Math.floor(ant.x);
  const cellY = Math.floor(ant.y);

  // Try following food pheromone gradient first
  const pheromoneDirection = followPheromoneGradient(
    world,
    cellX,
    cellY,
    'food'
  );

  if (pheromoneDirection) {
    // Follow pheromone trail
    ant.vx += pheromoneDirection.dx * PHEROMONE_FOLLOW_FORCE * dt;
    ant.vy += pheromoneDirection.dy * PHEROMONE_FOLLOW_FORCE * dt;
    return;
  }

  // Fall back to direct food seeking if no pheromones nearby
  let nearestFood = null;
  let nearestDist = Infinity;

  for (const food of foodItems) {
    const dx = food.x - ant.x;
    const dy = food.y - ant.y;
    const dist = Math.hypot(dx, dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestFood = food;
    }
  }

  if (nearestFood) {
    // Compute direction toward food
    const dx = nearestFood.x - ant.x;
    const dy = nearestFood.y - ant.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    // Apply steering force toward food
    const seekForce = WANDER_FORCE * 2; // stronger than random wander
    ant.vx += ux * seekForce * dt;
    ant.vy += uy * seekForce * dt;
  }
}

/**
 * Follow pheromone gradient in a given direction
 */
function followPheromoneGradient(
  world: any,
  cellX: number,
  cellY: number,
  type: 'food' | 'home'
): { dx: number; dy: number } | null {
  const offsets = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  let bestValue = 0;
  let bestDir = null;

  for (const offset of offsets) {
    const sx = cellX + offset.dx;
    const sy = cellY + offset.dy;
    const cell = getCell(world, sx, sy);
    if (!cell) continue;

    const value =
      type === 'food' ? cell.pheromoneFood : cell.pheromoneHome;

    if (value > bestValue && value > PHEROMONE_FOLLOW_THRESHOLD) {
      bestValue = value;
      bestDir = offset;
    }
  }

  return bestDir;
}

/**
 * Deposit pheromones based on ant state
 */
function depositPheromones(ant: Ant, gameState: GameState, dt: number): void {
  const cellX = Math.floor(ant.x);
  const cellY = Math.floor(ant.y);

  // Deposit home pheromone when in or near nest
  if (isInNest(cellX, cellY)) {
    depositHomePheromone(
      gameState,
      ant.x,
      ant.y,
      PHEROMONE_DEPOSIT_RATE * dt
    );
  }

  // Deposit food pheromone when satisfied (recently ate)
  // Use low hunger as proxy for "returning from food"
  if (ant.hunger < 0.3) {
    depositFoodPheromone(
      gameState,
      ant.x,
      ant.y,
      PHEROMONE_DEPOSIT_RATE * dt
    );
  }
}

/**
 * Check if ant is close enough to eat food
 */
function checkFoodConsumption(ant: Ant, gameState: GameState): void {
  for (let i = gameState.foodItems.length - 1; i >= 0; i--) {
    const food = gameState.foodItems[i];
    const dx = food.x - ant.x;
    const dy = food.y - ant.y;
    const dist = Math.hypot(dx, dy);

    if (dist < FOOD_EAT_RADIUS) {
      // Eat the food
      gameState.foodItems.splice(i, 1);
      ant.hunger = 0;
      gameState.colony.foodStored += 1;
      break; // only eat one food item per frame
    }
  }
}

/**
 * Update all dirt particles with gravity and collision
 */
function updateDirtParticles(gameState: GameState, dt: number): void {
  const { world, particles } = gameState;
  const particlesToRemove: number[] = [];

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];

    // Apply gravity
    particle.vy += GRAVITY * dt;

    // Update position
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;

    // Check collision with world
    const cellX = Math.floor(particle.x);
    const cellY = Math.floor(particle.y);

    // Check if particle hit bottom or solid cell
    if (cellY >= WORLD_HEIGHT - 1 || isSolidCell(world, cellX, cellY)) {
      // Try to place dirt in cell above
      const pileY = Math.max(0, cellY - 1);
      if (!isSolidCell(world, cellX, pileY)) {
        setCellToDirt(world, cellX, pileY);
      }
      // Mark particle for removal
      particlesToRemove.push(i);
    }
  }

  // Remove settled particles (reverse order to maintain indices)
  for (let i = particlesToRemove.length - 1; i >= 0; i--) {
    particles.splice(particlesToRemove[i], 1);
  }
}
