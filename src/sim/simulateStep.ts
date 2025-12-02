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
 * Check if ant is supported by terrain (floor OR walls)
 * Allows climbing in tunnels by detecting contact with walls
 */
function isAntSupported(ant: Ant, world: any): boolean {
  const x = ant.x;
  const y = ant.y;

  // Sample multiple points around the ant's perimeter
  const testPoints = [
    { dx: 0, dy: ANT_RADIUS * 0.15 },                // directly below
    { dx: -ANT_RADIUS * 0.8, dy: ANT_RADIUS * 0.7 }, // below-left
    { dx: ANT_RADIUS * 0.8, dy: ANT_RADIUS * 0.7 },  // below-right
    { dx: -ANT_RADIUS * 0.9, dy: 0 },                 // left wall
    { dx: ANT_RADIUS * 0.9, dy: 0 },                  // right wall
  ];

  for (const { dx, dy } of testPoints) {
    const cx = Math.floor(x + dx);
    const cy = Math.floor(y + dy);
    if (isSolidCell(world, cx, cy)) {
      return true; // Touching solid terrain (has traction)
    }
  }

  return false; // In open air, no support
}

/**
 * Find the best column to drop dirt near the ant
 * Chooses the lowest mound in a nearby range to create natural spreading
 * Avoids tunnel entrances and verifies air cell availability
 * Returns column X or null if no valid drop location found
 */
function findBestDropColumn(world: any, antX: number): number | null {
  const center = Math.floor(antX);
  const SEARCH_RADIUS = 4; // Look ±4 tiles from ant position

  let bestX: number | null = null;
  let lowestHeight = Infinity;

  for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
    const x = center + dx;

    // Skip out of bounds
    if (x < 0 || x >= WORLD_WIDTH) continue;

    // Don't drop dirt directly over a tunnel entrance
    if (columnHasTunnelBelowSurface(world, x)) continue;

    // Find the current mound height at this column
    const height = findMoundHeight(world, x);

    // Verify there's actually an air cell available above the mound
    const dropY = height - 1;
    if (dropY < 0) continue; // Would be out of bounds

    const targetCell = getCell(world, x, dropY);
    if (!targetCell || targetCell.type !== 'air') continue; // Not available

    // Choose the column with the lowest mound that has space
    if (height < lowestHeight) {
      lowestHeight = height;
      bestX = x;
    }
  }

  return bestX; // null if no valid location found
}

/**
 * Deposit dirt at the best location near the ant
 * Ants actively choose low spots to create natural, spreading mounds
 * Returns true if dirt was successfully placed, false otherwise
 * STRICT CONSERVATION: Only returns true if an air cell was converted to dirt
 */
function depositDirt(ant: Ant, world: any): boolean {
  // Find the best (lowest) nearby column to drop dirt
  const dropX = findBestDropColumn(world, ant.x);

  // No valid location found
  if (dropX === null) {
    return false; // Keep carrying, try again next frame
  }

  // Find the top of the mound at that column
  const moundTop = findMoundHeight(world, dropX);

  // Calculate drop position (one cell above mound top)
  const dropY = moundTop - 1;

  // Verify drop position is valid
  if (dropY < 0) {
    return false; // Out of bounds at top of world
  }

  // STRICT CHECK: Only place if target is AIR
  const targetCell = getCell(world, dropX, dropY);
  if (!targetCell || targetCell.type !== 'air') {
    return false; // Not an air cell, cannot place here
  }

  // SUCCESS: Convert air to dirt
  setCellToDirt(world, dropX, dropY);
  return true; // Dirt successfully placed
}

/**
 * Update a single ant with wandering, digging, and food-seeking behavior
 */
function updateAnt(ant: Ant, gameState: GameState, dt: number): void {
  const { world, foodItems } = gameState;

  // Increase hunger over time
  ant.hunger = Math.min(1, ant.hunger + HUNGER_RATE * dt);

  // Check if ant has support (floor or walls)
  const supported = isAntSupported(ant, world);
  const belowSurface = ant.y >= SOIL_START_Y - 0.5;
  const onSurface = ant.y < SOIL_START_Y - 0.2;

  // Gravity and climbing behavior
  if (ant.carrying === 'dirt' && belowSurface) {
    // CLIMBING MODE: Ant is carrying dirt in a tunnel
    if (supported) {
      // Touching wall or floor - apply smooth climbing force (not instant velocity)
      const CLIMB_FORCE = 25; // upward acceleration (cells per second²)
      ant.vy += -CLIMB_FORCE * dt; // Accumulate velocity smoothly
      // Damp horizontal movement while climbing for more vertical focus
      ant.vx *= 0.8;
    } else {
      // In open air within tunnel - reduced gravity
      ant.vy += GRAVITY * 0.3 * dt;
    }
  } else {
    // NORMAL MODE: Not carrying dirt, or already on surface
    if (!supported) {
      // In open air - apply gravity
      const gravityMultiplier = belowSurface ? 0.2 : 1.0; // Reduced in tunnels
      ant.vy += GRAVITY * gravityMultiplier * dt;
    } else {
      // Supported - damp vertical velocity to prevent jitter
      ant.vy *= 0.5;
    }
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

  // Carrying dirt behavior: deposit when reaching surface
  if (ant.carrying === 'dirt' && onSurface) {
    // On surface - try to deposit dirt
    // STRICT CONSERVATION: Only clear carrying if dirt was actually placed
    const placed = depositDirt(ant, world);
    if (placed) {
      ant.carrying = 'none'; // Successfully dropped dirt
    }
    // If not placed, ant keeps carrying and will try again next frame
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

  // Multi-directional collision: prevent overlap with solid blocks
  // Use tight collision box (90% of ant radius) to prevent visual overlap
  const COLLISION_RADIUS = ANT_RADIUS * 0.9;

  // Check BELOW (floor)
  const cellX = Math.floor(ant.x);
  const belowY = Math.floor(ant.y + COLLISION_RADIUS);
  const cellBelow = getCell(world, cellX, belowY);
  if (cellBelow && (cellBelow.type === 'dirt' || cellBelow.type === 'stone')) {
    const groundY = belowY;
    if (ant.y + COLLISION_RADIUS > groundY) {
      ant.y = groundY - COLLISION_RADIUS - 0.01;
      if (ant.vy > 0) ant.vy = 0; // Stop falling, but allow climbing
    }
  }

  // Check ABOVE (ceiling)
  const aboveY = Math.floor(ant.y - COLLISION_RADIUS);
  const cellAbove = getCell(world, cellX, aboveY);
  if (cellAbove && (cellAbove.type === 'dirt' || cellAbove.type === 'stone')) {
    const ceilingY = aboveY + 1; // Bottom of ceiling cell
    if (ant.y - COLLISION_RADIUS < ceilingY) {
      ant.y = ceilingY + COLLISION_RADIUS + 0.01;
      if (ant.vy < 0) ant.vy = 0; // Stop rising into ceiling
    }
  }

  // Check LEFT (left wall)
  const leftX = Math.floor(ant.x - COLLISION_RADIUS);
  const cellY = Math.floor(ant.y);
  const cellLeft = getCell(world, leftX, cellY);
  if (cellLeft && (cellLeft.type === 'dirt' || cellLeft.type === 'stone')) {
    const wallX = leftX + 1; // Right edge of left wall
    if (ant.x - COLLISION_RADIUS < wallX) {
      ant.x = wallX + COLLISION_RADIUS + 0.01;
      if (ant.vx < 0) ant.vx = 0; // Stop moving left
    }
  }

  // Check RIGHT (right wall)
  const rightX = Math.floor(ant.x + COLLISION_RADIUS);
  const cellRight = getCell(world, rightX, cellY);
  if (cellRight && (cellRight.type === 'dirt' || cellRight.type === 'stone')) {
    const wallX = rightX; // Left edge of right wall
    if (ant.x + COLLISION_RADIUS > wallX) {
      ant.x = wallX - COLLISION_RADIUS - 0.01;
      if (ant.vx > 0) ant.vx = 0; // Stop moving right
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
