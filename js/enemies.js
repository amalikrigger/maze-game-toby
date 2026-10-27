// ===== ENEMY AI: the three enemy "brains" =====
// Every time an enemy gets a turn, its brain answers one question:
// "Which way should I step?"  It returns [dx, dy], or null to stay still.
//   dx = -1 left, 1 right      dy = -1 up, 1 down

import { DIRECTIONS, isWall, findPath } from "./grid.js";

// CHASER (letter E): the starter game's AI.
// Try every open direction and pick the one that ends up closest to the player
// (counting squares across + squares down, ignoring walls).
// It is simple, but it gets stuck when a wall is between it and you.
function greedy(enemy, grid, player) {
  const distanceAfter = ([dx, dy]) =>
    Math.abs(enemy.x + dx - player.x) + Math.abs(enemy.y + dy - player.y);

  const open = DIRECTIONS.filter(([dx, dy]) => !isWall(grid, enemy.x + dx, enemy.y + dy));
  open.sort((a, b) => distanceAfter(a) - distanceAfter(b));
  return open[0] ?? null;
}

// HUNTER (letter H): uses breadth-first search (see findPath in grid.js)
// to find the real shortest path through the maze, then takes the first step of it.
// Walls can't fool it.
function hunter(enemy, grid, player) {
  const path = findPath(grid, enemy, player);
  if (!path || path.length === 0) return null;
  return [path[0].x - enemy.x, path[0].y - enemy.y];
}

// PATROLLER (letters R and V): ignores the player.
// It walks in a straight line and turns around when it hits a wall.
function patrol(enemy, grid) {
  let [dx, dy] = enemy.dir;
  if (isWall(grid, enemy.x + dx, enemy.y + dy)) {
    dx = -dx;
    dy = -dy;
    enemy.dir = [dx, dy];
  }
  if (isWall(grid, enemy.x + dx, enemy.y + dy)) return null; // walls on both sides: stay put
  return [dx, dy];
}

// SHOOTER (letter S) walks exactly like a Hunter. Its beam attack is in game.js (updateShooter).
export const BRAINS = { greedy, hunter, patrol, shooter: hunter };

// The squares a beam would hit, starting next to `from` and going in direction `dir`.
// It keeps going until it hits a wall. (The outside edge is all wall, so it always stops.)
export function beamSquares(grid, from, [dx, dy]) {
  const squares = [];
  let x = from.x + dx;
  let y = from.y + dy;
  while (!isWall(grid, x, y)) {
    squares.push({ x, y });
    x += dx;
    y += dy;
  }
  return squares;
}

// Is the player in a beam's path from this Shooter? Returns the direction to fire, or null.
export function lineOfFire(grid, shooter, player) {
  for (const dir of DIRECTIONS) {
    if (beamSquares(grid, shooter, dir).some((s) => s.x === player.x && s.y === player.y)) {
      return dir;
    }
  }
  return null;
}
