/**
 * Core game state types and initialization for ant farm simulation
 * Phase 1: Client-side only
 */

// ============================================================================
// Constants
// ============================================================================

export const WORLD_WIDTH = 192;  // 3x finer grid (was 64)
export const WORLD_HEIGHT = 108; // 3x finer grid (was 36)
export const CELL_SIZE = 4; // pixels per cell (was 12 - now 3x smaller)
export const SOIL_START_Y = 12; // rows 0-11 = air (surface), 12+ = dirt (was 4)

// ============================================================================
// Core Types
// ============================================================================

export interface GameState {
  meta: {
    version: number;
  };
  world: World;
  colony: Colony;
  ants: Ant[];
  particles: DirtParticle[];
  foodItems: FoodItem[];
  waterItems: WaterItem[];
  settings: Settings;
}

export interface World {
  width: number;
  height: number;
  cells: WorldCell[]; // flat array, length = width * height
}

export interface WorldCell {
  type: 'dirt' | 'air' | 'stone';
  pheromoneFood: number; // 0-1
  pheromoneHome: number; // 0-1
  isNest: boolean;
}

export type AntMode =
  | 'idleSurface'      // walking on surface, not carrying
  | 'diggingDown'      // inside shaft, moving down to dig
  | 'carryingUp'       // inside shaft, moving up with dirt
  | 'carryingSurface'; // on surface with dirt, looking to drop

export interface Ant {
  id: string;
  x: number;
  y: number;
  vx: number; // kept for compatibility but not actively used
  vy: number; // kept for compatibility but not actively used
  role: 'worker' | 'scout';
  state:
    | 'idle'
    | 'wandering'
    | 'seeking_food'
    | 'returning_home'
    | 'digging'
    | 'carrying_dirt'
    | 'carrying_food';
  hunger: number; // 0-1
  carrying: 'none' | 'dirt' | 'food';

  // New state machine fields
  mode: AntMode;
  hasDirt: boolean;   // true if carrying one dirt block
  homeColumn: number; // column of the shaft this ant works on
}

export interface DirtParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface FoodItem {
  x: number;
  y: number;
}

export interface WaterItem {
  x: number;
  y: number;
}

export interface Colony {
  foodStored: number;
  waterStored: number;
  population: number;
  queenAlive: boolean;
}

export interface Settings {
  simSpeed: number; // 0 = paused, 1 = normal, 2 = fast
  showDebugOverlays: boolean;
}

// ============================================================================
// Grid Helpers
// ============================================================================

export function getCellIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

export function getCell(world: World, x: number, y: number): WorldCell | null {
  if (x < 0 || x >= world.width || y < 0 || y >= world.height) {
    return null;
  }
  return world.cells[getCellIndex(x, y, world.width)];
}

export function setCell(
  world: World,
  x: number,
  y: number,
  cell: WorldCell
): void {
  if (x >= 0 && x < world.width && y >= 0 && y < world.height) {
    world.cells[getCellIndex(x, y, world.width)] = cell;
  }
}

// ============================================================================
// Initial State Creation
// ============================================================================

export function createInitialGameState(): GameState {
  // Create world cells - simple surface with dirt below
  const cells: WorldCell[] = [];

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const isAir = y < SOIL_START_Y;

      cells.push({
        type: isAir ? 'air' : 'dirt',
        pheromoneFood: 0,
        pheromoneHome: 0,
        isNest: false, // No pre-dug nest
      });
    }
  }

  // Create initial ants (spawn on surface)
  const ants: Ant[] = [];
  const INITIAL_ANT_COUNT = 5;

  for (let i = 0; i < INITIAL_ANT_COUNT; i++) {
    const x = Math.random() * WORLD_WIDTH;
    ants.push({
      id: `ant-${i}`,
      x,
      y: SOIL_START_Y - 0.5, // on surface
      vx: 0,
      vy: 0,
      role: i % 3 === 0 ? 'scout' : 'worker',
      state: 'wandering',
      hunger: 0,
      carrying: 'none',
      // New state machine fields
      mode: 'idleSurface',
      hasDirt: false,
      homeColumn: Math.floor(x),
    });
  }

  return {
    meta: {
      version: 1,
    },
    world: {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      cells,
    },
    colony: {
      foodStored: 0,
      waterStored: 0,
      population: INITIAL_ANT_COUNT,
      queenAlive: true,
    },
    ants,
    particles: [],
    foodItems: [],
    waterItems: [],
    settings: {
      simSpeed: 1, // normal speed
      showDebugOverlays: false,
    },
  };
}
