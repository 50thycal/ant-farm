// Sandbox Renderer - draws the sand simulation to canvas

import {
  SandboxState,
  Cell,
  Ant,
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
const ANT_COLOR = '#D2691E'; // Chocolate/orange-brown ant (visible!)
const ANT_CARRY_COLOR = '#FF4500'; // Orange-red when carrying sand

// Pre-compute a color index for each cell position for consistent coloring
function getSandColor(x: number, y: number): string {
  // Use position to create consistent but varied coloring
  const index = (x * 7 + y * 13) % SAND_COLORS.length;
  return SAND_COLORS[index];
}

// Draw a single ant
function drawAnt(ctx: CanvasRenderingContext2D, ant: Ant): void {
  const screenX = ant.x * CELL_SIZE;
  const screenY = ant.y * CELL_SIZE;

  // Ant body color depends on whether carrying sand
  ctx.fillStyle = ant.carrySand ? ANT_CARRY_COLOR : ANT_COLOR;

  // Draw ant body (3 segments)
  const segmentSize = CELL_SIZE * 0.8;

  // Abdomen (back)
  ctx.beginPath();
  ctx.ellipse(
    screenX - ant.direction * segmentSize * 0.8,
    screenY,
    segmentSize * 0.6,
    segmentSize * 0.5,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  // Thorax (middle)
  ctx.beginPath();
  ctx.ellipse(
    screenX,
    screenY - segmentSize * 0.1,
    segmentSize * 0.4,
    segmentSize * 0.35,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(
    screenX + ant.direction * segmentSize * 0.6,
    screenY - segmentSize * 0.1,
    segmentSize * 0.35,
    segmentSize * 0.3,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  // Legs (6 legs, 3 on each side)
  ctx.strokeStyle = ANT_COLOR;
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    const legX = screenX + i * segmentSize * 0.3;
    // Left legs
    ctx.beginPath();
    ctx.moveTo(legX, screenY);
    ctx.lineTo(legX - segmentSize * 0.4, screenY + segmentSize * 0.5);
    ctx.stroke();
    // Right legs
    ctx.beginPath();
    ctx.moveTo(legX, screenY);
    ctx.lineTo(legX + segmentSize * 0.4, screenY + segmentSize * 0.5);
    ctx.stroke();
  }

  // Antennae
  const headX = screenX + ant.direction * segmentSize * 0.6;
  const headY = screenY - segmentSize * 0.1;
  ctx.beginPath();
  ctx.moveTo(headX, headY - segmentSize * 0.2);
  ctx.lineTo(headX + ant.direction * segmentSize * 0.4, headY - segmentSize * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headX, headY - segmentSize * 0.2);
  ctx.lineTo(headX + ant.direction * segmentSize * 0.2, headY - segmentSize * 0.6);
  ctx.stroke();

  // Draw carried sand
  if (ant.carrySand) {
    ctx.fillStyle = SAND_COLORS[0];
    ctx.beginPath();
    ctx.arc(
      headX + ant.direction * segmentSize * 0.3,
      headY - segmentSize * 0.2,
      segmentSize * 0.25,
      0, Math.PI * 2
    );
    ctx.fill();
  }
}

// Main render function
export function render(ctx: CanvasRenderingContext2D, state: SandboxState): void {
  const { grid, ants, marker } = state;

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

  // Draw marker if it exists
  if (marker) {
    const markerX = marker.x * CELL_SIZE;
    const markerY = marker.y * CELL_SIZE;
    const markerSize = CELL_SIZE * 3;

    // Draw pulsing marker (target/crosshair style)
    ctx.strokeStyle = '#00FF00'; // Bright green
    ctx.lineWidth = 2;

    // Outer circle
    ctx.beginPath();
    ctx.arc(markerX + CELL_SIZE / 2, markerY + CELL_SIZE / 2, markerSize, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(markerX + CELL_SIZE / 2, markerY + CELL_SIZE / 2, markerSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(markerX - markerSize, markerY + CELL_SIZE / 2);
    ctx.lineTo(markerX + markerSize + CELL_SIZE, markerY + CELL_SIZE / 2);
    ctx.moveTo(markerX + CELL_SIZE / 2, markerY - markerSize);
    ctx.lineTo(markerX + CELL_SIZE / 2, markerY + markerSize + CELL_SIZE);
    ctx.stroke();
  }

  // Draw ants
  for (const ant of ants) {
    drawAnt(ctx, ant);
  }

  // Draw glass container overlay (subtle)
  ctx.fillStyle = GLASS_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw container frame
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
}
