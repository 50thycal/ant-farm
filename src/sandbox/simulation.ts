// Sand physics simulation
// Uses cellular automata rules for realistic sand behavior

import { SandboxState, Cell, WORLD_WIDTH, WORLD_HEIGHT, Ant, ANT_WALK_SPEED } from './types';

// Helper to create a key for tracking sand positions
function sandKey(x: number, y: number): string {
  return `${x},${y}`;
}

// Check if any ant occupies a given cell position
function isAntAt(ants: Ant[], x: number, y: number): boolean {
  for (const ant of ants) {
    const antX = Math.floor(ant.x);
    const antY = Math.floor(ant.y);
    // Check if ant occupies this cell or adjacent cells (ant takes up ~1x1 space)
    if (Math.abs(antX - x) <= 0 && Math.abs(antY - y) <= 0) {
      return true;
    }
  }
  return false;
}

// Check if a cell is empty (sand can move there)
function isEmpty(grid: Cell[][], x: number, y: number, ants?: Ant[]): boolean {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return false;
  }
  // Don't allow sand to move into cells occupied by ants
  if (ants && isAntAt(ants, x, y)) {
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
  const { grid, ants, activeSand } = state;
  state.tick++;

  // Only process active sand particles (those that might still be moving)
  // Convert to array to avoid modifying set during iteration
  const activeCells = Array.from(activeSand);

  for (const key of activeCells) {
    const [x, y] = key.split(',').map(Number);

    // Skip if this cell is no longer sand (may have been moved already this frame)
    if (grid[y][x] !== Cell.Sand) {
      activeSand.delete(key);
      continue;
    }

    updateCell(state, x, y, ants);
  }

  // Update ants
  for (const ant of ants) {
    updateAnt(state, ant);
  }
}

// Update ant position and behavior
function updateAnt(state: SandboxState, ant: Ant): void {
  const { grid } = state;
  const x = Math.floor(ant.x);
  const y = Math.floor(ant.y);

  // Decrease cooldowns
  if (ant.digCooldown > 0) ant.digCooldown--;

  // Check if ant is attached to any surface (ground, wall, or ceiling)
  const onGround = isSolid(grid, x, y + 1);
  const onCeiling = isSolid(grid, x, y - 1);
  const onWallLeft = isSolid(grid, x - 1, y);
  const onWallRight = isSolid(grid, x + 1, y);
  const isAttached = onGround || onCeiling || onWallLeft || onWallRight;

  // Apply gravity only if not attached to any surface
  if (!isAttached) {
    ant.y += 0.5; // Fall
    return; // Don't do anything else while falling
  }

  // Ant behavior based on state
  switch (ant.state) {
    case 'walking':
      walkBehavior(grid, ant, state);
      break;
    case 'digging':
      digBehavior(state, ant);
      break;
    case 'dropping':
      dropBehavior(state, ant);
      break;
  }
}

// Walking behavior - move around, sometimes dig
function walkBehavior(grid: Cell[][], ant: Ant, state?: SandboxState): void {
  const x = Math.floor(ant.x);
  const y = Math.floor(ant.y);

  // If there's a marker, try to move toward it
  if (state?.marker) {
    const marker = state.marker;
    const dx = marker.x - x;
    // const dy = marker.y - y; // TODO: Use for vertical pathfinding

    // Prefer direction toward marker if we're not already going that way
    if (Math.abs(dx) > 2) { // Only change direction if marker is not too close
      const preferredDirection = dx > 0 ? 1 : -1;
      if (ant.direction !== preferredDirection) {
        // Check if we can move in the preferred direction
        const canMoveTowardMarker =
          isEmpty(grid, x + preferredDirection, y) ||
          isSolid(grid, x + preferredDirection, y); // Can climb

        if (canMoveTowardMarker || Math.random() < 0.3) {
          ant.direction = preferredDirection as 1 | -1;
        }
      }
    }
  }

  const nextX = x + ant.direction;

  // Priority 1: Try to walk forward on floor
  const canWalkForward = isEmpty(grid, nextX, y) && isSolid(grid, nextX, y + 1);

  // Priority 2: Try to walk down a slope
  const canWalkDown = isEmpty(grid, nextX, y) && isEmpty(grid, nextX, y + 1) && isSolid(grid, nextX, y + 2);

  // Priority 3: Try to climb up (check multiple heights)
  let canClimb = false;
  let climbHeight = 0;
  const maxClimbHeight = 10; // Ant can climb up to 10 blocks

  for (let h = 1; h <= maxClimbHeight; h++) {
    const climbY = y - h;
    // Check if we can climb to this height: need solid wall and empty space at target
    if (isEmpty(grid, x, climbY) && isEmpty(grid, nextX, climbY) && isSolid(grid, nextX, y)) {
      // Found a climbable height
      canClimb = true;
      climbHeight = h;
      break;
    }
    // Stop if we hit ceiling
    if (isSolid(grid, x, climbY)) {
      break;
    }
  }

  // Priority 4: Try to walk on ceiling (solid above, empty below)
  const canWalkCeiling = isEmpty(grid, nextX, y) && isSolid(grid, nextX, y - 1) && !isSolid(grid, x, y - 1);

  // Priority 5: Try to walk on wall (solid to the side)
  const canWalkWall = isEmpty(grid, x, y - 1) && isSolid(grid, nextX, y);

  // Execute movement in priority order
  if (canWalkForward) {
    ant.x += ant.direction * ANT_WALK_SPEED;
  } else if (canWalkDown) {
    ant.x += ant.direction * ANT_WALK_SPEED;
    ant.y += 1;
  } else if (canClimb) {
    // Climb up the wall
    ant.y -= 1;
    // Also move forward slightly if we're at the top
    if (climbHeight === 1 || isEmpty(grid, nextX, y - climbHeight)) {
      ant.x += ant.direction * ANT_WALK_SPEED * 0.5;
    }
  } else if (canWalkCeiling) {
    // Walk along ceiling
    ant.x += ant.direction * ANT_WALK_SPEED;
    ant.y -= 1;
  } else if (canWalkWall) {
    // Walk up the wall
    ant.y -= 1;
  } else {
    // Can't move forward in any way - check if we should dig or turn around
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
function digBehavior(state: SandboxState, ant: Ant): void {
  if (ant.digCooldown > 0) return;

  const { grid, activeSand } = state;
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
      activeSand.delete(sandKey(digX, digY));
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
function dropBehavior(state: SandboxState, ant: Ant): void {
  if (!ant.carrySand) {
    ant.state = 'walking';
    return;
  }

  const { grid, activeSand } = state;
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
      activeSand.add(sandKey(dropX, dropY)); // Mark dropped sand as active
      ant.carrySand = false;
      ant.state = 'walking';
      return;
    }
  }

  // Couldn't drop, keep walking
  ant.state = 'walking';
}

// Update a single sand particle
function updateCell(state: SandboxState, x: number, y: number, ants: Ant[]): void {
  const { grid, activeSand } = state;
  if (grid[y][x] !== Cell.Sand) return;

  const currentKey = sandKey(x, y);
  let moved = false;

  // Try to fall straight down
  if (isEmpty(grid, x, y + 1, ants)) {
    grid[y][x] = Cell.Empty;
    grid[y + 1][x] = Cell.Sand;
    activeSand.delete(currentKey);
    activeSand.add(sandKey(x, y + 1));
    return;
  }

  // Try to slide diagonally (randomly choose direction first for natural piling)
  const goLeft = Math.random() < 0.5;

  if (goLeft) {
    // Try left-down first, then right-down
    if (isEmpty(grid, x - 1, y + 1, ants) && isEmpty(grid, x - 1, y, ants)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x - 1] = Cell.Sand;
      activeSand.delete(currentKey);
      activeSand.add(sandKey(x - 1, y + 1));
      moved = true;
    } else if (isEmpty(grid, x + 1, y + 1, ants) && isEmpty(grid, x + 1, y, ants)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x + 1] = Cell.Sand;
      activeSand.delete(currentKey);
      activeSand.add(sandKey(x + 1, y + 1));
      moved = true;
    }
  } else {
    // Try right-down first, then left-down
    if (isEmpty(grid, x + 1, y + 1, ants) && isEmpty(grid, x + 1, y, ants)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x + 1] = Cell.Sand;
      activeSand.delete(currentKey);
      activeSand.add(sandKey(x + 1, y + 1));
      moved = true;
    } else if (isEmpty(grid, x - 1, y + 1, ants) && isEmpty(grid, x - 1, y, ants)) {
      grid[y][x] = Cell.Empty;
      grid[y + 1][x - 1] = Cell.Sand;
      activeSand.delete(currentKey);
      activeSand.add(sandKey(x - 1, y + 1));
      moved = true;
    }
  }

  // Only settle if we didn't move AND there's no active sand nearby
  // Check if sand below or diagonally below is still active
  if (!moved) {
    const hasActiveSandBelow =
      activeSand.has(sandKey(x, y + 1)) ||
      activeSand.has(sandKey(x - 1, y + 1)) ||
      activeSand.has(sandKey(x + 1, y + 1));

    // If there's active sand below, stay active (it might create space)
    // Otherwise, we've settled
    if (!hasActiveSandBelow) {
      activeSand.delete(currentKey);
    }
  }
}

// Add sand at a position (for user interaction)
export function addSand(state: SandboxState, x: number, y: number, radius: number = 3): void {
  const { grid, activeSand } = state;

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
        // Mark new sand as active so it can fall
        activeSand.add(sandKey(px, py));
      }
    }
  }
}

// Remove sand at a position
export function removeSand(state: SandboxState, x: number, y: number, radius: number = 3): void {
  const { grid, activeSand } = state;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx;
      const py = y + dy;

      if (px < 0 || px >= WORLD_WIDTH || py < 0 || py >= WORLD_HEIGHT) continue;
      if (dx * dx + dy * dy > radius * radius) continue;

      if (grid[py][px] === Cell.Sand) {
        grid[py][px] = Cell.Empty;
        activeSand.delete(sandKey(px, py));
      }
    }
  }
}
