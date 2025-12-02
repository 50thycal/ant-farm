/**
 * Canvas renderer for ant farm
 * Draws the game state to a 2D canvas context
 */

import type { GameState, Ant, DirtParticle } from '../sim/gameState';
import { CELL_SIZE } from '../sim/gameState';

// Size constants (relative to cell size)
const ANT_RADIUS_FACTOR = 0.3; // Ant size relative to cell
// const DIRT_PARTICLE_RADIUS_FACTOR = ANT_RADIUS_FACTOR * 0.25; // Dirt is 1/4 ant size (commented for test)

/**
 * Draw a single ant
 */
function drawAnt(ctx: CanvasRenderingContext2D, ant: Ant): void {
  const antPixelX = ant.x * CELL_SIZE;
  const antPixelY = ant.y * CELL_SIZE;
  const antRadius = CELL_SIZE * ANT_RADIUS_FACTOR;

  ctx.beginPath();
  ctx.arc(antPixelX, antPixelY, antRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#FF0000'; // red
  ctx.fill();
}

/**
 * Draw a single dirt particle
 */
function drawDirtParticle(ctx: CanvasRenderingContext2D, particle: DirtParticle): void {
  const x = particle.x * CELL_SIZE;
  const y = particle.y * CELL_SIZE;

  // Hard-coded test: tiny magenta dots
  const r = 2; // fixed 2px, independent of CELL_SIZE

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ff00ff"; // bright magenta
  ctx.fill();
}

/**
 * Draw the game state to the canvas
 * @param ctx - 2D canvas rendering context
 * @param gameState - current game state
 */
export function drawGameState(
  ctx: CanvasRenderingContext2D,
  gameState: GameState
): void {
  const { world } = gameState;
  const canvasWidth = world.width * CELL_SIZE;
  const canvasHeight = world.height * CELL_SIZE;

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // TEMP: Disable world cell rendering to isolate particles
  // Draw world cells
  /*
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
  */

  // Draw ants
  for (const ant of gameState.ants) {
    drawAnt(ctx, ant);
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
  // TEMP: Log particle count to verify they exist
  if (gameState.particles.length > 0) {
    console.log("Rendering", gameState.particles.length, "dirt particles");
  }

  for (const particle of gameState.particles) {
    drawDirtParticle(ctx, particle);
  }

  // Debug overlay: pheromone heatmap
  if (gameState.settings.showDebugOverlays) {
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const cellIndex = y * world.width + x;
        const cell = world.cells[cellIndex];

        // Draw food pheromone (green tint)
        if (cell.pheromoneFood > 0.05) {
          ctx.fillStyle = `rgba(0, 255, 0, ${cell.pheromoneFood * 0.5})`;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }

        // Draw home pheromone (blue tint)
        if (cell.pheromoneHome > 0.05) {
          ctx.fillStyle = `rgba(0, 100, 255, ${cell.pheromoneHome * 0.5})`;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }

  // TEMP TEST: Draw a bright magenta dot in center to verify rendering works
  const testX = (world.width / 2) * CELL_SIZE;
  const testY = (world.height / 2) * CELL_SIZE;
  const testRadius = 4;

  ctx.beginPath();
  ctx.arc(testX, testY, testRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ff00ff"; // bright magenta
  ctx.fill();
}
