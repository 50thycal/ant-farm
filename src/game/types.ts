// Core game types for Ant Farm simulation

export const CELL_SIZE = 8;
export const WORLD_WIDTH = 80;
export const WORLD_HEIGHT = 60;
export const CANVAS_WIDTH = WORLD_WIDTH * CELL_SIZE;
export const CANVAS_HEIGHT = WORLD_HEIGHT * CELL_SIZE;

// Cell types in the world grid
export enum CellType {
  Air = 0,
  Dirt = 1,
  Sand = 2,
  Tunnel = 3,
  Food = 4,
  Water = 5,
}

// Ant states
export enum AntState {
  Idle = 'idle',
  Walking = 'walking',
  Digging = 'digging',
  CarryingFood = 'carrying_food',
  CarryingDirt = 'carrying_dirt',
  Eating = 'eating',
}

// Direction for ant movement
export type Direction = -1 | 0 | 1;

// Ant entity
export interface Ant {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: AntState;
  direction: Direction;
  grounded: boolean;
  hunger: number;
  carryingFood: boolean;
  carryingDirt: boolean;
  targetX: number | null;
  targetY: number | null;
  digCooldown: number;
  thinkCooldown: number;
}

// Food item dropped on surface
export interface FoodItem {
  id: number;
  x: number;
  y: number;
  amount: number;
}

// The complete game state
export interface GameState {
  world: CellType[][];
  ants: Ant[];
  food: FoodItem[];
  colony: {
    foodStored: number;
    population: number;
  };
  tick: number;
  paused: boolean;
  speed: number;
}

// Create initial world with terrain
export function createInitialWorld(): CellType[][] {
  const world: CellType[][] = [];

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < WORLD_WIDTH; x++) {
      // Sky (top 40%)
      if (y < WORLD_HEIGHT * 0.4) {
        row.push(CellType.Air);
      }
      // Surface layer with some variation
      else if (y < WORLD_HEIGHT * 0.4 + 2) {
        row.push(CellType.Dirt);
      }
      // Underground dirt
      else {
        row.push(CellType.Dirt);
      }
    }
    world.push(row);
  }

  return world;
}

// Create a new ant
export function createAnt(id: number, x: number, y: number): Ant {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    state: AntState.Idle,
    direction: Math.random() > 0.5 ? 1 : -1,
    grounded: false,
    hunger: 0,
    carryingFood: false,
    carryingDirt: false,
    targetX: null,
    targetY: null,
    digCooldown: 0,
    thinkCooldown: 0,
  };
}

// Create initial game state
export function createInitialGameState(): GameState {
  const world = createInitialWorld();

  // Find surface level (first dirt from top in center)
  const centerX = Math.floor(WORLD_WIDTH / 2);
  let surfaceY = 0;
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    if (world[y][centerX] === CellType.Dirt) {
      surfaceY = y;
      break;
    }
  }

  // Create initial tunnel entrance
  const entranceX = centerX;
  const entranceY = surfaceY;

  // Dig a small starting tunnel
  for (let dy = 0; dy < 8; dy++) {
    const ty = entranceY + dy;
    if (ty < WORLD_HEIGHT) {
      world[ty][entranceX] = CellType.Tunnel;
      if (entranceX > 0) world[ty][entranceX - 1] = CellType.Tunnel;
      if (entranceX < WORLD_WIDTH - 1) world[ty][entranceX + 1] = CellType.Tunnel;
    }
  }

  // Create starting ants near entrance
  const ants: Ant[] = [];
  for (let i = 0; i < 5; i++) {
    const antX = entranceX + (Math.random() - 0.5) * 2;
    const antY = entranceY + 2 + Math.random() * 4;
    ants.push(createAnt(i, antX, antY));
  }

  return {
    world,
    ants,
    food: [],
    colony: {
      foodStored: 10,
      population: ants.length,
    },
    tick: 0,
    paused: false,
    speed: 1,
  };
}
