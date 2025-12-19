// Sand physics simulation
// Uses cellular automata rules for realistic sand behavior

import { SandboxState, Cell, WORLD_WIDTH, WORLD_HEIGHT } from './types';

// Check if a cell is empty (sand can move there)
function isEmpty(grid: Cell[][], x: number, y: number): boolean {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return false;
  }
  return grid[y][x] === Cell.Empty;
}

// Simulate one step of sand physics
export function simulateStep(state: SandboxState): void {
  const { grid } = state;
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
