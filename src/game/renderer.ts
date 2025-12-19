// Canvas Renderer for Ant Farm

import {
  GameState,
  CellType,
  CELL_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';

// Color palette
const COLORS = {
  sky: '#87CEEB',
  dirt: '#8B4513',
  dirtDark: '#6B3410',
  tunnel: '#3D2817',
  sand: '#C2B280',
  ant: '#1a1a1a',
  antCarrying: '#8B0000',
  food: '#32CD32',
  foodItem: '#228B22',
  water: '#4169E1',
};

// Draw the world grid
function drawWorld(ctx: CanvasRenderingContext2D, world: CellType[][]): void {
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const cell = world[y][x];
      let color: string;

      switch (cell) {
        case CellType.Air:
          color = COLORS.sky;
          break;
        case CellType.Dirt:
          // Add some variation
          color = (x + y) % 3 === 0 ? COLORS.dirtDark : COLORS.dirt;
          break;
        case CellType.Sand:
          color = COLORS.sand;
          break;
        case CellType.Tunnel:
          color = COLORS.tunnel;
          break;
        case CellType.Food:
          color = COLORS.food;
          break;
        case CellType.Water:
          color = COLORS.water;
          break;
        default:
          color = COLORS.sky;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

// Draw ants
function drawAnts(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const ant of state.ants) {
    const screenX = ant.x * CELL_SIZE;
    const screenY = ant.y * CELL_SIZE;

    // Ant body
    ctx.fillStyle = ant.carryingFood || ant.carryingDirt ? COLORS.antCarrying : COLORS.ant;

    // Draw ant as an oval/ellipse
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, CELL_SIZE * 0.6, CELL_SIZE * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headX = screenX + ant.direction * CELL_SIZE * 0.4;
    ctx.beginPath();
    ctx.arc(headX, screenY - CELL_SIZE * 0.1, CELL_SIZE * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Legs (simple lines)
    ctx.strokeStyle = COLORS.ant;
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      const legX = screenX + i * CELL_SIZE * 0.3;
      ctx.beginPath();
      ctx.moveTo(legX, screenY);
      ctx.lineTo(legX - CELL_SIZE * 0.2, screenY + CELL_SIZE * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(legX, screenY);
      ctx.lineTo(legX + CELL_SIZE * 0.2, screenY + CELL_SIZE * 0.4);
      ctx.stroke();
    }

    // Antennae
    ctx.beginPath();
    ctx.moveTo(headX, screenY - CELL_SIZE * 0.2);
    ctx.lineTo(headX + ant.direction * CELL_SIZE * 0.3, screenY - CELL_SIZE * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headX, screenY - CELL_SIZE * 0.2);
    ctx.lineTo(headX + ant.direction * CELL_SIZE * 0.1, screenY - CELL_SIZE * 0.5);
    ctx.stroke();

    // Draw carried item
    if (ant.carryingFood) {
      ctx.fillStyle = COLORS.food;
      ctx.beginPath();
      ctx.arc(headX + ant.direction * CELL_SIZE * 0.3, screenY - CELL_SIZE * 0.2, CELL_SIZE * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (ant.carryingDirt) {
      ctx.fillStyle = COLORS.dirt;
      ctx.beginPath();
      ctx.arc(headX + ant.direction * CELL_SIZE * 0.3, screenY - CELL_SIZE * 0.2, CELL_SIZE * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Draw food items
function drawFood(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const food of state.food) {
    const screenX = food.x * CELL_SIZE;
    const screenY = food.y * CELL_SIZE;

    ctx.fillStyle = COLORS.foodItem;
    ctx.beginPath();
    ctx.arc(screenX, screenY, CELL_SIZE * 0.4 + food.amount * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Leaf shape on top
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - CELL_SIZE * 0.3, CELL_SIZE * 0.3, CELL_SIZE * 0.15, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw HUD
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(5, 5, 150, 60);

  ctx.fillStyle = 'white';
  ctx.font = '12px monospace';
  ctx.fillText(`Ants: ${state.ants.length}`, 10, 20);
  ctx.fillText(`Food Stored: ${state.colony.foodStored}`, 10, 35);
  ctx.fillText(`Food Items: ${state.food.length}`, 10, 50);
  ctx.fillText(state.paused ? 'PAUSED' : `Speed: ${state.speed}x`, 10, 65);
}

// Main render function
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Clear canvas
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw layers
  drawWorld(ctx, state.world);
  drawFood(ctx, state);
  drawAnts(ctx, state);
  drawHUD(ctx, state);
}
