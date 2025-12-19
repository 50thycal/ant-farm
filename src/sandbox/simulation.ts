// Sand physics simulation
// Uses cellular automata rules for realistic sand behavior

import { SandboxState, Cell, WORLD_WIDTH, WORLD_HEIGHT, Ant } from './types';

// Check if a cell is empty (sand can move there)
function isEmpty(grid: Cell[][], x: number, y: number): boolean {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return false;
  }
  return grid[y][x] === Cell.Empty;
}

// Check if cell is solid (ant can walk on it)
function isSolid(grid: Cell[][], x: number, y: number): boolean {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return true; // Out of bounds counts as solid
  }
  return grid[y][x] === Cell.Sand || grid[y][x] === Cell.Wall;
}

// Check if cell is diggable
function isDiggable(grid: Cell[][], x: number, y: number): boolean {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return false;
  }
  return grid[y][x] === Cell.Sand;
}

// Simulate one step of sand physics
export function simulateStep(state: SandboxState): void {
  const { grid, ants } = state;
  state.tick++;

  // Process from bottom to top, so falling sand doesn't get processed twice
  // Alternate left-right sweep direction each frame for more natural flow
  const leftToRight = state.tick % 2 === 0;

  for (let y = WORLD_HEIGHT - 2; y >= 0; y--) {
    if (leftToRight) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        updateCell(grid, x, y);
      }
    } else {
      for (let x = WORLD_WIDTH - 1; x >= 0; x--) {
        updateCell(grid, x, y);
      }
    }
  }

  // Update ants
  for (const ant of ants) {
    updateAnt(grid, ant);
  }
}

// Update ant position and behavior
function updateAnt(grid: Cell[][], ant: Ant): void {
  const x = Math.floor(ant.x);
  const y = Math.floor(ant.y);

  // Decrease cooldowns
  if (ant.digCooldown > 0) ant.digCooldown--;

  // Check if ant is on ground (has solid below)
  const onGround = isSolid(grid, x, y + 1);

  // Apply gravity if not on ground
  if (!onGround) {
    ant.y += 0.5; // Fall
    return; // Don't do anything else while falling
  }

  // Ant behavior based on state
  switch (ant.state) {
    case 'walking':
      walkBehavior(grid, ant);
      break;
    case 'digging':
      digBehavior(grid, ant);
      break;
    case 'dropping':
      dropBehavior(grid, ant);
      break;
  }
}

// Walking behavior - move around, sometimes dig
function walkBehavior(grid: Cell[][], ant: Ant): void {
  const x = Math.floor(ant.x);
  const y = Math.floor(ant.y);
  const nextX = x + ant.direction;

  // Check if we can walk forward
  const canWalkForward = isEmpty(grid, nextX, y) && isSolid(grid, nextX, y + 1);

  // Check if we can climb up (wall in front, empty above)
  const canClimbUp = isSolid(grid, nextX, y) && isEmpty(grid, x, y - 1) && isEmpty(grid, nextX, y - 1);

  // Check if we can walk down a slope
  const canWalkDown = isEmpty(grid, nextX, y) && isEmpty(grid, nextX, y + 1) && isSolid(grid, nextX, y + 2);

  if (canWalkForward) {
    ant.x += ant.direction * 0.5;
  } else if (canClimbUp) {
    ant.y -= 1;
    ant.x += ant.direction * 0.5;
  } else if (canWalkDown) {
    ant.x += ant.direction * 0.5;
    ant.y += 1;
  } else {
    // Can't move forward, check if we should dig or turn around
    if (!ant.carrySand && isDiggable(grid, nextX, y) && Math.random() < 0.3) {
      ant.state = 'digging';
    } else {
      // Turn around
      ant.direction = ant.direction === 1 ? -1 : 1;
    }
  }

  // Random chance to start digging if on sand
  if (!ant.carrySand && Math.random() < 0.02 && isDiggable(grid, x, y + 1)) {
    ant.state = 'digging';
  }

  // If carrying sand, occasionally drop it
  if (ant.carrySand && Math.random() < 0.01) {
    ant.state = 'dropping';
  }
}

// Digging behavior - pick up sand
function digBehavior(grid: Cell[][], ant: Ant): void {
  if (ant.digCooldown > 0) return;

  const x = Math.floor(ant.x);
  const y = Math.floor(ant.y);

  // Try to dig in front first, then below
  const digTargets = [
    { dx: ant.direction, dy: 0 },  // In front
    { dx: ant.direction, dy: 1 },  // Front-below
    { dx: 0, dy: 1 },              // Below
  ];

  for (const target of digTargets) {
    const digX = x + target.dx;
    const digY = y + target.dy;

    if (isDiggable(grid, digX, digY)) {
      grid[digY][digX] = Cell.Empty;
      ant.carrySand = true;
      ant.digCooldown = 10;
      ant.state = 'walking';
      return;
    }
  }

  // Nothing to dig, go back to walking
  ant.state = 'walking';
}

// Dropping behavior - place sand
function dropBehavior(grid: Cell[][], ant: Ant): void {
  if (!ant.carrySand) {
    ant.state = 'walking';
    return;
  }

  const x = Math.floor(ant.x);
  const y = Math.floor(ant.y);

  // Try to drop sand in various positions
  const dropTargets = [
    { dx: ant.direction, dy: 0 },  // In front
    { dx: 0, dy: -1 },             // Above
    { dx: -ant.direction, dy: 0 }, // Behind
  ];

  for (const target of dropTargets) {
    const dropX = x + target.dx;
    const dropY = y + target.dy;

    if (isEmpty(grid, dropX, dropY)) {
      grid[dropY][dropX] = Cell.Sand;
      ant.carrySand = false;
      ant.state = 'walking';
      return;
    }
  }

  // Couldn't drop, keep walking
  ant.state = 'walking';
}

// Update a single sand particle
function updateCell(grid: Cell[][], x: number, y: number): void {
  if (grid[y][x] !== Cell.Sand) return;

  // Try to fall straight down
  if (isEmpty(grid, x, y + 1)) {
    grid[y][x] = Cell.Empty;
    grid[y + 1][x] = Cell.Sand;
    return;
  }

  // Try to slide diagonally (randomly choose direction first for natural piling)
  const goLeft = Math.random() < 0.5;

  if (goLeft) {
    // Try left-down first, then right-down
    if (isEmpty(grid, x - 1, y + 1) && isEmpty(grid, x - 1, y)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x - 1] = Cell.Sand;
    } else if (isEmpty(grid, x + 1, y + 1) && isEmpty(grid, x + 1, y)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x + 1] = Cell.Sand;
    }
  } else {
    // Try right-down first, then left-down
    if (isEmpty(grid, x + 1, y + 1) && isEmpty(grid, x + 1, y)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x + 1] = Cell.Sand;
    } else if (isEmpty(grid, x - 1, y + 1) && isEmpty(grid, x - 1, y)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x - 1] = Cell.Sand;
    }
  }
}

// Add sand at a position (for user interaction)
export function addSand(state: SandboxState, x: number, y: number, radius: number = 3): void {
  const { grid } = state;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx;
      const py = y + dy;

      // Check bounds
      if (px < 0 || px >= WORLD_WIDTH || py < 0 || py >= WORLD_HEIGHT) continue;

      // Check if within circular radius
      if (dx * dx + dy * dy > radius * radius) continue;

      // Only add to empty cells
      if (grid[py][px] === Cell.Empty) {
        grid[py][px] = Cell.Sand;
      }
    }
  }
}

// Remove sand at a position
export function removeSand(state: SandboxState, x: number, y: number, radius: number = 3): void {
  const { grid } = state;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx;
      const py = y + dy;

      if (px < 0 || px >= WORLD_WIDTH || py < 0 || py >= WORLD_HEIGHT) continue;
      if (dx * dx + dy * dy > radius * radius) continue;

      if (grid[py][px] === Cell.Sand) {
        grid[py][px] = Cell.Empty;
      }
    }
  }
}
