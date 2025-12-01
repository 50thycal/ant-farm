/**
 * Canvas renderer for ant farm
 * Draws the game state to a 2D canvas context
 */

import type { GameState } from '../sim/gameState';

const CELL_SIZE = 12; // pixels per grid cell

/**
 * Draw the game state to the canvas
 * @param gameState - current game state
 * @param ctx - 2D canvas rendering context
 */
export function draw(gameState: GameState, ctx: CanvasRenderingContext2D): void {
  const { world } = gameState;
  const canvasWidth = world.width * CELL_SIZE;
  const canvasHeight = world.height * CELL_SIZE;

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw world cells
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const cellIndex = y * world.width + x;
      const cell = world.cells[cellIndex];

      if (cell.type === 'dirt') {
        ctx.fillStyle = '#8B4513'; // brown
      } else if (cell.type === 'stone') {
        ctx.fillStyle = '#555555'; // gray
      } else if (cell.isNest) {
        ctx.fillStyle = '#2a2a2a'; // dark gray for nest
      } else {
        ctx.fillStyle = '#87CEEB'; // sky blue for air
      }

      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  // Draw ants
  ctx.fillStyle = '#FF0000'; // red
  for (const ant of gameState.ants) {
    const screenX = ant.x * CELL_SIZE;
    const screenY = ant.y * CELL_SIZE;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw food items
  ctx.fillStyle = '#00FF00'; // green
  for (const food of gameState.foodItems) {
    const screenX = food.x * CELL_SIZE;
    const screenY = food.y * CELL_SIZE;
    ctx.fillRect(screenX - 3, screenY - 3, 6, 6);
  }

  // Draw water items
  ctx.fillStyle = '#0000FF'; // blue
  for (const water of gameState.waterItems) {
    const screenX = water.x * CELL_SIZE;
    const screenY = water.y * CELL_SIZE;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw dirt particles
  ctx.fillStyle = '#A0522D'; // sienna
  for (const particle of gameState.particles) {
    const screenX = particle.x * CELL_SIZE;
    const screenY = particle.y * CELL_SIZE;
    ctx.fillRect(screenX - 1, screenY - 1, 2, 2);
  }
}
