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
  isSolidCell,
  isInNest,
  columnHasTunnelBelowSurface,
  findMoundHeight,
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
const ANT_RADIUS = 0.3; // ant size for collision detection

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
 * Check if ant is standing on solid ground
 */
function isAntOnGround(ant: Ant, world: any): boolean {
  const belowY = Math.floor(ant.y + ANT_RADIUS + 0.01);
  const cellX = Math.floor(ant.x);
  return isSolidCell(world, cellX, belowY);
}

/**
 * Find the best column to drop dirt near the ant
 * Chooses the lowest mound in a nearby range to create natural spreading
 * Avoids tunnel entrances to keep them clear
 */
function findBestDropColumn(world: any, antX: number): number {
  const center = Math.floor(antX);
  const SEARCH_RADIUS = 4; // Look ±4 tiles from ant position

  let bestX = center;
  let lowestHeight = Infinity;

  for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
    const x = center + dx;

    // Skip out of bounds
    if (x < 0 || x >= WORLD_WIDTH) continue;

    // Don't drop dirt directly over a tunnel entrance
    if (columnHasTunnelBelowSurface(world, x)) continue;

    // Find the current mound height at this column
    const height = findMoundHeight(world, x);

    // Choose the column with the lowest mound
    if (height < lowestHeight) {
      lowestHeight = height;
      bestX = x;
    }
  }

  return bestX;
}

/**
 * Deposit dirt at the best location near the ant
 * Ants actively choose low spots to create natural, spreading mounds
 */
function depositDirt(ant: Ant, world: any): void {
  // Find the best (lowest) nearby column to drop dirt
  const dropX = findBestDropColumn(world, ant.x);

  // Find the top of the mound at that column
  const moundTop = findMoundHeight(world, dropX);

  // Place dirt one cell above the current mound top
  const dropY = moundTop - 1;

  // Only place if within world bounds
  if (dropY >= 0) {
    const targetCell = getCell(world, dropX, dropY);
    if (targetCell && targetCell.type === 'air') {
      setCellToDirt(world, dropX, dropY);
    }
  }
}

/**
 * Update a single ant with wandering, digging, and food-seeking behavior
 */
function updateAnt(ant: Ant, gameState: GameState, dt: number): void {
  const { world, foodItems } = gameState;

  // Increase hunger over time
  ant.hunger = Math.min(1, ant.hunger + HUNGER_RATE * dt);

  // Apply gravity when not on ground
  // Reduce gravity in tunnels (below surface) to allow traversal
  if (!isAntOnGround(ant, world)) {
    const belowSurface = ant.y >= SOIL_START_Y;
    const gravityMultiplier = belowSurface ? 0.15 : 1.0; // Much less gravity in tunnels
    ant.vy += GRAVITY * gravityMultiplier * dt;
  }

  // Digging behavior: dig cell below feet when standing on dirt
  // Ant picks up dirt to carry to surface
  if (isAntOnGround(ant, world) && ant.carrying === 'none') {
    const cellX = Math.floor(ant.x);
    const belowY = Math.floor(ant.y + ANT_RADIUS + 0.01);

    const digChance = DIG_CHANCE_PER_SECOND * dt;
    if (Math.random() < digChance) {
      setCellToAir(world, cellX, belowY);
      ant.carrying = 'dirt'; // Pick up the dirt (ant now carries this chunk)
      // No particles spawned - ant carries the dirt to surface
    }
  }

  // Carrying dirt behavior: return to surface and deposit
  if (ant.carrying === 'dirt') {
    // Strong upward bias to return to surface
    ant.vy += -WANDER_FORCE * 0.8 * dt;

    // Check if reached surface
    if (ant.y < SOIL_START_Y) {
      // Deposit dirt near current location (spread mound horizontally)
      depositDirt(ant, world);
      ant.carrying = 'none';
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

  // Ground collision: keep ant on top of dirt, not inside it
  // Use same formula as isAntOnGround() to check the cell below feet
  const cellX = Math.floor(ant.x);
  const belowY = Math.floor(ant.y + ANT_RADIUS + 0.01);
  const cellBelow = getCell(world, cellX, belowY);

  if (cellBelow && (cellBelow.type === 'dirt' || cellBelow.type === 'stone')) {
    // Ant is overlapping with solid ground, push it up
    const groundY = belowY;
    if (ant.y + ANT_RADIUS > groundY) {
      ant.y = groundY - ANT_RADIUS;
      ant.vy = 0; // stop vertical movement when landing
    }
  }

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
 * Apply random wandering acceleration (primarily horizontal)
 * Adds vertical movement when in tunnels below surface
 */
function randomWander(ant: Ant, dt: number): void {
  // Apply random horizontal wandering acceleration occasionally
  if (Math.random() < 0.1) {
    // Horizontal movement: randomly choose left or right
    const direction = Math.random() < 0.5 ? -1 : 1;
    ant.vx += direction * WANDER_FORCE * dt;

    // Add vertical wandering when in tunnels (below surface)
    // This allows ants to climb up through their tunnels
    if (ant.y >= SOIL_START_Y) {
      const verticalDirection = Math.random() < 0.5 ? -1 : 1;
      ant.vy += verticalDirection * WANDER_FORCE * 0.5 * dt; // Half strength vertical
    }
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

    // Remove particle when it hits bottom or solid cell
    // Particles are now just visual effects; dirt placement handled by ant carrying
    if (cellY >= WORLD_HEIGHT - 1 || isSolidCell(world, cellX, cellY)) {
      particlesToRemove.push(i);
    }
  }

  // Remove settled particles (reverse order to maintain indices)
  for (let i = particlesToRemove.length - 1; i >= 0; i--) {
    particles.splice(particlesToRemove[i], 1);
  }
}
