// Sandbox types - A falling sand simulation

export const CELL_SIZE = 4; // Small particles
export const WORLD_WIDTH = 160; // Grid cells wide
export const WORLD_HEIGHT = 120; // Grid cells tall
export const CANVAS_WIDTH = WORLD_WIDTH * CELL_SIZE;
export const CANVAS_HEIGHT = WORLD_HEIGHT * CELL_SIZE;

// Ant behavior constants
export const ANT_WALK_SPEED = 0.05; // Adjust this to change ant speed (try 0.1 to 1.0)

// Cell types
export enum Cell {
  Empty = 0,
  Sand = 1,
  Wall = 2, // Container walls
}

// Ant state
export interface Ant {
  x: number;
  y: number;
  direction: 1 | -1; // 1 = right, -1 = left
  carrySand: boolean;
  state: 'walking' | 'digging' | 'dropping';
  digCooldown: number;
}

// The sandbox state
export interface SandboxState {
  grid: Cell[][];
  ants: Ant[];
  tick: number;
  activeSand: Set<string>; // Track which sand particles are active (can move)
  marker: { x: number; y: number } | null; // Goal marker for ant navigation
}

// Create a new ant
export function createAnt(x: number, y: number): Ant {
  return {
    x,
    y,
    direction: Math.random() > 0.5 ? 1 : -1,
    carrySand: false,
    state: 'walking',
    digCooldown: 0,
  };
}

// Create empty grid
export function createEmptyGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < WORLD_WIDTH; x++) {
      row.push(Cell.Empty);
    }
    grid.push(row);
  }
  return grid;
}

// Create sandbox with container walls
export function createSandbox(): SandboxState {
  const grid = createEmptyGrid();

  // Add container walls (bottom and sides)
  // Left wall
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    grid[y][0] = Cell.Wall;
    grid[y][1] = Cell.Wall;
  }
  // Right wall
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    grid[y][WORLD_WIDTH - 1] = Cell.Wall;
    grid[y][WORLD_WIDTH - 2] = Cell.Wall;
  }
  // Bottom wall
  for (let x = 0; x < WORLD_WIDTH; x++) {
    grid[WORLD_HEIGHT - 1][x] = Cell.Wall;
    grid[WORLD_HEIGHT - 2][x] = Cell.Wall;
  }

  return {
    grid,
    ants: [],
    tick: 0,
    activeSand: new Set(),
    marker: null,
  };
}

// Create sandbox pre-filled with sand
export function createFilledSandbox(): SandboxState {
  const state = createSandbox();

  // Fill most of the container with sand
  // Leave some space at top for it to settle
  const fillHeight = Math.floor(WORLD_HEIGHT * 0.7);
  const startY = WORLD_HEIGHT - fillHeight;

  for (let y = startY; y < WORLD_HEIGHT - 2; y++) {
    for (let x = 2; x < WORLD_WIDTH - 2; x++) {
      // Random fill to create interesting initial settling
      if (Math.random() < 0.85) {
        state.grid[y][x] = Cell.Sand;
        // Mark initial sand as active so it can settle
        state.activeSand.add(`${x},${y}`);
      }
    }
  }

  // Add an ant on top of the sand
  const antX = Math.floor(WORLD_WIDTH / 2);
  const antY = startY - 2; // Just above the sand
  state.ants.push(createAnt(antX, antY));

  return state;
}
