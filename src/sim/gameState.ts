/**
 * Core game state types and initialization for ant farm simulation
 * Phase 1: Client-side only
 */

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

export interface Ant {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  const width = 64;
  const height = 36;

  // Create world cells
  const cells: WorldCell[] = [];
  const airThreshold = Math.floor(height * 0.2); // top 20% is air

  // Nest parameters (bottom-center)
  const nestWidth = 8;
  const nestHeight = 4;
  const nestX = Math.floor((width - nestWidth) / 2);
  const nestY = height - nestHeight - 4; // 4 cells from bottom

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isInNest =
        x >= nestX &&
        x < nestX + nestWidth &&
        y >= nestY &&
        y < nestY + nestHeight;

      const type = y < airThreshold || isInNest ? 'air' : 'dirt';

      cells.push({
        type,
        pheromoneFood: 0,
        pheromoneHome: 0,
        isNest: isInNest,
      });
    }
  }

  // Create initial ants (spawn in nest area)
  const ants: Ant[] = [];
  const initialAntCount = 10;

  for (let i = 0; i < initialAntCount; i++) {
    ants.push({
      id: `ant-${i}`,
      x: nestX + Math.random() * nestWidth,
      y: nestY + Math.random() * nestHeight,
      vx: 0,
      vy: 0,
      role: i % 3 === 0 ? 'scout' : 'worker',
      state: 'wandering',
      hunger: Math.random() * 0.3, // start with low hunger
      carrying: 'none',
    });
  }

  return {
    meta: {
      version: 1,
    },
    world: {
      width,
      height,
      cells,
    },
    colony: {
      foodStored: 0,
      waterStored: 0,
      population: initialAntCount,
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
