// Sandbox Renderer - draws the sand simulation to canvas

import {
  SandboxState,
  Cell,
  CELL_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';

// Color palette for sand - slight variations for visual interest
const SAND_COLORS = [
  '#E6C47F', // Light tan
  '#D4A84B', // Golden
  '#C9A227', // Dark gold
  '#DEB887', // Burlywood
  '#D2B48C', // Tan
];

const WALL_COLOR = '#4A3728'; // Dark brown wood
const BACKGROUND_COLOR = '#1a1a2e'; // Dark blue background
const GLASS_COLOR = 'rgba(200, 220, 255, 0.1)'; // Subtle glass tint

// Pre-compute a color index for each cell position for consistent coloring
function getSandColor(x: number, y: number): string {
  // Use position to create consistent but varied coloring
  const index = (x * 7 + y * 13) % SAND_COLORS.length;
  return SAND_COLORS[index];
}

// Main render function
export function render(ctx: CanvasRenderingContext2D, state: SandboxState): void {
  const { grid } = state;

  // Clear with background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw each cell
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const cell = grid[y][x];

      if (cell === Cell.Empty) continue;

      const screenX = x * CELL_SIZE;
      const screenY = y * CELL_SIZE;

      if (cell === Cell.Sand) {
        ctx.fillStyle = getSandColor(x, y);
        ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
      } else if (cell === Cell.Wall) {
        ctx.fillStyle = WALL_COLOR;
        ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Draw glass container overlay (subtle)
  ctx.fillStyle = GLASS_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw container frame
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
}
