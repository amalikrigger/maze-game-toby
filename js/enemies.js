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

// GHOST (letter W): floats straight through walls, so the shortest path is just a straight line.
// It steps along whichever direction (across or down) you are farthest away in.
function ghost(enemy, grid, player) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  if (dx === 0 && dy === 0) return null;
  return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
}

// PORTALER (letter T): ignores the player and wanders around the maze.
// It keeps walking the same way, and at a crossing it picks a random new way (but never turns back,
// unless it is in a dead end). Its portals are made in game.js (updatePortalers).
function wander(enemy, grid) {
  const open = DIRECTIONS.filter(([dx, dy]) => !isWall(grid, enemy.x + dx, enemy.y + dy));
  if (open.length === 0) return null;
  const back = enemy.dir && open.find(([dx, dy]) => dx === -enemy.dir[0] && dy === -enemy.dir[1]);
  const ahead = open.filter((d) => d !== back);
  const choices = ahead.length > 0 ? ahead : open;
  enemy.dir = choices[Math.floor(Math.random() * choices.length)];
  return enemy.dir;
}

// SHOOTER (letter S) walks exactly like a Hunter. Its beam attack is in game.js (updateShooter).
// SPLITTER (letter B) also walks like a Hunter. Its splitting is in game.js (updateSplitters).
// VORTEX (letter O) slowly walks like a Hunter too. Its pulling is in game.js (updateVortexes).
// SHADE (letter D) also slowly walks like a Hunter. Its darkness is drawn in renderer.js.
// DECEIVER (letter X) wanders like a Portaler (it never follows you). Its splitting at intersections is in game.js (splitDeceiver).
export const BRAINS = {
  greedy, hunter, patrol, shooter: hunter, ghost, splitter: hunter, vortex: hunter, portaler: wander, shade: hunter,
  deceiver: wander,
};

// VORTEX PULL: which way to tug a mover one square closer to a Vortex (in a straight line, like a magnet).
// Only Ghosts can be pulled through walls. Returns [dx, dy], or null if a wall is in the way.
export function pullStep(grid, mover, vortex, throughWalls) {
  const distanceAfter = ([dx, dy]) => Math.hypot(vortex.x - (mover.x + dx), vortex.y - (mover.y + dy));
  let best = null;
  let bestDistance = distanceAfter([0, 0]);
  for (const dir of DIRECTIONS) {
    if (!throughWalls && isWall(grid, mover.x + dir[0], mover.y + dir[1])) continue;
    if (distanceAfter(dir) < bestDistance) {
      best = dir;
      bestDistance = distanceAfter(dir);
    }
  }
  return best;
}

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
