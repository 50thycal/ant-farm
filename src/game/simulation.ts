// Ant Farm Simulation Logic

import {
  GameState,
  Ant,
  AntState,
  CellType,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  createAnt,
} from './types';

const GRAVITY = 0.5;
const MAX_FALL_SPEED = 8;
const WALK_SPEED = 1.5;
const CLIMB_SPEED = 1.0;
const DIG_TIME = 15;
const THINK_TIME = 30;
const HUNGER_RATE = 0.001;
const HUNGER_THRESHOLD = 0.7;

// Check if a cell is solid (blocks movement)
function isSolid(world: CellType[][], x: number, y: number): boolean {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx < 0 || gx >= WORLD_WIDTH || gy < 0 || gy >= WORLD_HEIGHT) {
    return true; // Out of bounds is solid
  }
  const cell = world[gy][gx];
  return cell === CellType.Dirt || cell === CellType.Sand;
}

// Check if a cell is passable (air, tunnel, etc.)
function isPassable(world: CellType[][], x: number, y: number): boolean {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx < 0 || gx >= WORLD_WIDTH || gy < 0 || gy >= WORLD_HEIGHT) {
    return false;
  }
  const cell = world[gy][gx];
  return cell === CellType.Air || cell === CellType.Tunnel;
}

// Check if ant is on ground
function checkGrounded(world: CellType[][], x: number, y: number): boolean {
  return isSolid(world, x, y + 1);
}

// Check if ant can climb (wall next to it)
function canClimb(world: CellType[][], x: number, y: number, dir: number): boolean {
  return isSolid(world, x + dir, y) && isPassable(world, x, y - 1);
}

// Find food on surface
function findNearestFood(state: GameState, ant: Ant): { x: number; y: number } | null {
  let nearest: { x: number; y: number; dist: number } | null = null;

  for (const food of state.food) {
    const dist = Math.abs(food.x - ant.x) + Math.abs(food.y - ant.y);
    if (!nearest || dist < nearest.dist) {
      nearest = { x: food.x, y: food.y, dist };
    }
  }

  return nearest ? { x: nearest.x, y: nearest.y } : null;
}

// Update single ant behavior
function updateAnt(state: GameState, ant: Ant): void {
  const { world } = state;

  // Apply gravity if not grounded
  ant.grounded = checkGrounded(world, ant.x, ant.y);
  if (!ant.grounded) {
    ant.vy = Math.min(ant.vy + GRAVITY, MAX_FALL_SPEED);
  } else {
    ant.vy = 0;
  }

  // Update hunger
  ant.hunger = Math.min(1, ant.hunger + HUNGER_RATE);

  // Update cooldowns
  if (ant.digCooldown > 0) ant.digCooldown--;
  if (ant.thinkCooldown > 0) ant.thinkCooldown--;

  // State machine for ant behavior
  switch (ant.state) {
    case AntState.Idle:
      if (ant.thinkCooldown <= 0) {
        // Decide what to do
        if (ant.hunger > HUNGER_THRESHOLD && state.colony.foodStored > 0) {
          ant.state = AntState.Eating;
          state.colony.foodStored--;
          ant.hunger = 0;
        } else if (state.food.length > 0 && !ant.carryingFood) {
          // Go find food
          const foodTarget = findNearestFood(state, ant);
          if (foodTarget) {
            ant.targetX = foodTarget.x;
            ant.targetY = foodTarget.y;
            ant.state = AntState.Walking;
          }
        } else if (Math.random() < 0.3) {
          // Random walk or dig
          ant.direction = Math.random() > 0.5 ? 1 : -1;
          ant.state = Math.random() < 0.5 ? AntState.Walking : AntState.Digging;
        }
        ant.thinkCooldown = THINK_TIME + Math.random() * THINK_TIME;
      }
      break;

    case AntState.Walking:
      if (ant.grounded) {
        // Move horizontally
        const nextX = ant.x + ant.direction * WALK_SPEED;

        // Check if we can walk forward
        if (isPassable(world, nextX, ant.y)) {
          ant.vx = ant.direction * WALK_SPEED;
        }
        // Try to climb
        else if (canClimb(world, ant.x, ant.y, ant.direction)) {
          ant.vy = -CLIMB_SPEED;
          ant.vx = ant.direction * WALK_SPEED * 0.5;
        }
        // Turn around
        else {
          ant.direction = (ant.direction * -1) as -1 | 1;
          ant.vx = 0;
        }

        // Check if reached food
        for (let i = state.food.length - 1; i >= 0; i--) {
          const food = state.food[i];
          const dist = Math.abs(food.x - ant.x) + Math.abs(food.y - ant.y);
          if (dist < 2) {
            ant.carryingFood = true;
            food.amount--;
            if (food.amount <= 0) {
              state.food.splice(i, 1);
            }
            ant.state = AntState.CarryingFood;
            ant.targetX = null;
            ant.targetY = null;
            break;
          }
        }

        // Random state changes
        if (ant.thinkCooldown <= 0) {
          if (Math.random() < 0.1) {
            ant.state = AntState.Idle;
          } else if (Math.random() < 0.05) {
            ant.direction = (ant.direction * -1) as -1 | 1;
          }
          ant.thinkCooldown = THINK_TIME;
        }
      }
      break;

    case AntState.Digging:
      if (ant.grounded && ant.digCooldown <= 0) {
        // Try to dig in front or below
        const digX = Math.floor(ant.x + ant.direction);
        const digY = Math.floor(ant.y + 1);

        if (digX >= 0 && digX < WORLD_WIDTH && digY >= 0 && digY < WORLD_HEIGHT) {
          if (world[digY][digX] === CellType.Dirt) {
            world[digY][digX] = CellType.Tunnel;
            ant.carryingDirt = true;
            ant.state = AntState.CarryingDirt;
            ant.digCooldown = DIG_TIME;
          }
        }

        // Sometimes stop digging
        if (Math.random() < 0.1) {
          ant.state = AntState.Idle;
        }
      }
      ant.vx = 0;
      break;

    case AntState.CarryingFood:
      // Head back to colony (center, underground)
      if (ant.grounded) {
        const homeX = WORLD_WIDTH / 2;

        if (Math.abs(ant.x - homeX) < 3 && ant.y > WORLD_HEIGHT * 0.4) {
          // Deposit food
          ant.carryingFood = false;
          state.colony.foodStored++;
          ant.state = AntState.Idle;
        } else {
          // Move toward home
          ant.direction = ant.x < homeX ? 1 : -1;
          const nextX = ant.x + ant.direction * WALK_SPEED;

          if (isPassable(world, nextX, ant.y)) {
            ant.vx = ant.direction * WALK_SPEED;
          } else if (canClimb(world, ant.x, ant.y, ant.direction)) {
            ant.vy = -CLIMB_SPEED;
            ant.vx = ant.direction * WALK_SPEED * 0.5;
          } else {
            ant.direction = (ant.direction * -1) as -1 | 1;
          }
        }
      }
      break;

    case AntState.CarryingDirt:
      // Carry dirt to surface
      if (ant.grounded) {
        // Move upward and toward exit
        const exitX = WORLD_WIDTH / 2;

        if (ant.y < WORLD_HEIGHT * 0.42) {
          // At surface, drop dirt
          ant.carryingDirt = false;
          ant.state = AntState.Idle;
          // Could spawn a dirt pile here
        } else {
          ant.direction = ant.x < exitX ? 1 : -1;
          const nextX = ant.x + ant.direction * WALK_SPEED;

          if (isPassable(world, nextX, ant.y)) {
            ant.vx = ant.direction * WALK_SPEED;
          } else if (isPassable(world, ant.x, ant.y - 1)) {
            ant.vy = -CLIMB_SPEED;
          } else {
            ant.direction = (ant.direction * -1) as -1 | 1;
          }
        }
      }
      break;

    case AntState.Eating:
      ant.vx = 0;
      if (ant.thinkCooldown <= 0) {
        ant.state = AntState.Idle;
        ant.thinkCooldown = THINK_TIME;
      }
      break;
  }

  // Apply velocities with collision
  const newX = ant.x + ant.vx;
  const newY = ant.y + ant.vy;

  // Horizontal collision
  if (!isSolid(world, newX, ant.y)) {
    ant.x = newX;
  } else {
    ant.vx = 0;
  }

  // Vertical collision
  if (!isSolid(world, ant.x, newY)) {
    ant.y = newY;
  } else {
    ant.vy = 0;
    if (newY > ant.y) {
      ant.grounded = true;
    }
  }

  // Keep in bounds
  ant.x = Math.max(0.5, Math.min(WORLD_WIDTH - 0.5, ant.x));
  ant.y = Math.max(0.5, Math.min(WORLD_HEIGHT - 0.5, ant.y));

  // Reset horizontal velocity for next frame
  ant.vx = 0;
}

// Main simulation step
export function simulateStep(state: GameState): void {
  if (state.paused) return;

  const steps = state.speed;
  for (let s = 0; s < steps; s++) {
    state.tick++;

    // Update all ants
    for (const ant of state.ants) {
      updateAnt(state, ant);
    }

    // Occasionally spawn new ant if colony is doing well
    if (state.tick % 500 === 0 && state.colony.foodStored > 5 && state.ants.length < 20) {
      const newAnt = createAnt(
        state.ants.length,
        WORLD_WIDTH / 2 + (Math.random() - 0.5) * 4,
        WORLD_HEIGHT * 0.45
      );
      state.ants.push(newAnt);
      state.colony.population = state.ants.length;
    }
  }
}

// Add food at a position
export function addFood(state: GameState, x: number, y: number): void {
  state.food.push({
    id: Date.now(),
    x: Math.floor(x),
    y: Math.floor(y),
    amount: 5,
  });
}

// Dig at a position
export function digAt(state: GameState, x: number, y: number): void {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx >= 0 && gx < WORLD_WIDTH && gy >= 0 && gy < WORLD_HEIGHT) {
    if (state.world[gy][gx] === CellType.Dirt) {
      state.world[gy][gx] = CellType.Tunnel;
    }
  }
}
