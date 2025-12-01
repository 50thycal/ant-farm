/**
 * World grid helper functions
 * Utilities for accessing and modifying the world grid
 */

import type { World, WorldCell } from './gameState';
import { WORLD_HEIGHT } from './gameState';

// Nest region: define as bottom portion of world
// (no pre-dug nest, but ants will establish here)
const NEST_DEPTH_FROM_BOTTOM = 8; // bottom 8 rows considered "nest depth"

/**
 * Get the index of a cell in the flat cells array
 */
export function getCellIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

/**
 * Check if coordinates are within world bounds
 */
export function isInBounds(world: World, x: number, y: number): boolean {
  return x >= 0 && x < world.width && y >= 0 && y < world.height;
}

/**
 * Get a cell at the given coordinates
 * Returns null if out of bounds
 */
export function getCell(world: World, x: number, y: number): WorldCell | null {
  if (!isInBounds(world, x, y)) {
    return null;
  }
  return world.cells[getCellIndex(x, y, world.width)];
}

/**
 * Set a cell at the given coordinates
 */
export function setCell(
  world: World,
  x: number,
  y: number,
  cell: WorldCell
): void {
  if (isInBounds(world, x, y)) {
    world.cells[getCellIndex(x, y, world.width)] = cell;
  }
}

/**
 * Check if a cell is solid (dirt or stone)
 */
export function isSolidCell(world: World, x: number, y: number): boolean {
  const cell = getCell(world, x, y);
  return cell !== null && (cell.type === 'dirt' || cell.type === 'stone');
}

/**
 * Convert a cell to air
 */
export function setCellToAir(world: World, x: number, y: number): void {
  const cell = getCell(world, x, y);
  if (cell) {
    cell.type = 'air';
  }
}

/**
 * Convert a cell to dirt
 */
export function setCellToDirt(world: World, x: number, y: number): void {
  const cell = getCell(world, x, y);
  if (cell) {
    cell.type = 'dirt';
  }
}

/**
 * Check if coordinates are in the nest region
 * Now defined as the bottom portion of the world
 */
export function isInNest(_x: number, y: number): boolean {
  return y >= WORLD_HEIGHT - NEST_DEPTH_FROM_BOTTOM;
}
