// ===== MAZE GENERATOR: makes a brand new random maze (used on Hard) =====
// Each random level is the same SIZE as the hand-made level and has the SAME enemies,
// but the walls and the enemy spots are new.
//
// The SEED is a number that picks the maze. The same seed always makes the same maze,
// so "Try Again" gives you the same maze, and you can share a good (or evil) maze number.
// To replay a maze, add ?difficulty=hard&seed=12345 to the address.
//
// How a maze is made:
//   1. "Recursive backtracker": start in one square and keep digging to a random unvisited
//      neighbour. When stuck, go back until there is somewhere new to dig. This makes one
//      long, twisty maze where every square can be reached.
//   2. Knock down a few extra walls to make loops, so you can run around enemies.
//   3. Put the enemies on or next to the route from P to G, never too close to P.

import { CONFIG } from "./config.js";
import { LEVELS } from "./levels.js";
import { findPath, parseLevel, validateLevel, ENEMY_LETTERS } from "./grid.js";

// How many extra walls get knocked down to make loops, for levels 1 to 6.
// 0 = no loops at all, 1 = no inside walls left. More loops = easier to escape.
const LOOP_CHANCE = [0.15, 0.15, 0.15, 0.25, 0.2, 0.2];

// Enemies that can reach you from far away (Ghosts go through walls, Mimics can become Ghosts,
// Vortexes pull you from 15 squares away, Shades turn the lights off from 10 squares away)
// are only placed on the far part of the route, so they don't get you right at the start.
const FAR_ENEMIES = "WMOD";

// A random maze number for a new game
export function randomSeed() {
  return 1 + Math.floor(Math.random() * 99999);
}

// A "seeded" random number maker: the same seed always gives the same numbers.
// (Math.random can't do that.) Returns a function that gives a number from 0 to just under 1.
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Make the random maze for one level. Returns rows of letters, just like a level in levels.js.
export function generateLevel(levelIndex, seed) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const random = makeRandom(seed * 1009 + levelIndex * 7919 + attempt * 104729);
    const rows = tryToGenerate(levelIndex, random);
    if (rows && validateLevel(rows).length === 0) return rows;
  }
  return LEVELS[levelIndex]; // should never happen, but the hand-made level is a safe backup
}

function tryToGenerate(levelIndex, random) {
  const model = LEVELS[levelIndex];
  const width = model[0].length;
  const height = model.length;
  // The maze is made of "rooms" on the odd squares, with walls (or gaps) between them
  const roomsAcross = (width - 1) / 2;
  const roomsDown = (height - 1) / 2;
  const squareOf = (rx, ry) => ({ x: 2 * rx + 1, y: 2 * ry + 1 });
  const pick = (list) => list[Math.floor(random() * list.length)];

  const g = Array.from({ length: height }, () => Array(width).fill("#"));

  // Levels where the goal never moves get a walled-off goal corner with only ONE way in
  const hasGoalCorner = CONFIG.fixedGoalLevels.includes(levelIndex + 1);
  const cornerLeft = hasGoalCorner ? roomsAcross - Math.round(roomsAcross * 0.23) : roomsAcross;
  const cornerTop = hasGoalCorner ? roomsDown - Math.round(roomsDown * 0.25) : roomsDown;
  const inCorner = (rx, ry) => rx >= cornerLeft && ry >= cornerTop;

  // 1. Recursive backtracker (once for the main maze, once inside the goal corner)
  function dig(startRx, startRy, allowed) {
    const visited = new Set([`${startRx},${startRy}`]);
    const stack = [[startRx, startRy]];
    const first = squareOf(startRx, startRy);
    g[first.y][first.x] = " ";
    while (stack.length > 0) {
      const [rx, ry] = stack[stack.length - 1];
      const choices = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [rx + dx, ry + dy, dx, dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < roomsAcross && ny < roomsDown &&
          allowed(nx, ny) && !visited.has(`${nx},${ny}`));
      if (choices.length === 0) {
        stack.pop(); // dead end: go back
        continue;
      }
      const [nx, ny, dx, dy] = pick(choices);
      visited.add(`${nx},${ny}`);
      const here = squareOf(rx, ry);
      g[here.y + dy][here.x + dx] = " "; // knock down the wall between the two rooms
      const next = squareOf(nx, ny);
      g[next.y][next.x] = " ";
      stack.push([nx, ny]);
    }
  }
  dig(0, 0, (rx, ry) => !inCorner(rx, ry));
  if (hasGoalCorner) dig(roomsAcross - 1, roomsDown - 1, inCorner);

  // 2. Loops: knock down some of the walls between two rooms (but never into the goal corner)
  const roomAt = (x, y) => [(x - 1) / 2, (y - 1) / 2];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (g[y][x] !== "#") continue;
      let a, b;
      if (x % 2 === 0 && y % 2 === 1) [a, b] = [roomAt(x - 1, y), roomAt(x + 1, y)];      // wall between left and right rooms
      else if (x % 2 === 1 && y % 2 === 0) [a, b] = [roomAt(x, y - 1), roomAt(x, y + 1)]; // wall between rooms above and below
      else continue; // a corner post, always stays a wall
      if (inCorner(...a) || inCorner(...b)) continue;
      if (random() < LOOP_CHANCE[levelIndex]) g[y][x] = " ";
    }
  }

  const start = squareOf(0, 0);
  const goal = squareOf(roomsAcross - 1, roomsDown - 1);
  const rowsNow = () => g.map((row) => row.join(""));

  // The one way into the goal corner: the spot on its edge that is farthest from the goal
  if (hasGoalCorner) {
    const cornerGrid = parseLevel(rowsNow());
    let best = null;
    const tryDoor = (insideRoom, wall) => {
      const inside = squareOf(...insideRoom);
      const length = findPath(cornerGrid, inside, goal)?.length ?? 0;
      if (!best || length > best.length) best = { wall, length };
    };
    for (let ry = cornerTop; ry < roomsDown; ry++) tryDoor([cornerLeft, ry], { x: 2 * cornerLeft, y: 2 * ry + 1 });
    for (let rx = cornerLeft; rx < roomsAcross; rx++) tryDoor([rx, cornerTop], { x: 2 * rx + 1, y: 2 * cornerTop });
    g[best.wall.y][best.wall.x] = " ";
  }

  g[start.y][start.x] = "P";
  g[goal.y][goal.x] = "G";

  // 3. Enemies: the same ones as the hand-made level, spread out along the route from P to G
  const route = findPath(parseLevel(rowsNow()), start, goal);
  if (!route) return null;
  const isCornerSquare = (x, y) => hasGoalCorner && x >= 2 * cornerLeft && y >= 2 * cornerTop;
  removeChokePoints(g, route, start, isCornerSquare);
  const safeDistance = Math.max(10, Math.round(route.length * 0.12)); // no enemies this close to P
  const spots = route.slice(safeDistance).filter((s) => !isCornerSquare(s.x, s.y));

  const letters = [...model.join("")].filter((letter) => ENEMY_LETTERS[letter]);
  shuffle(letters, random);
  if (!placeEnemies(g, letters, spots, start, random, isCornerSquare)) return null;

  // Turn the maze around so P isn't always in the top-left corner.
  // The goal is made in the bottom-right, so on levels where the goal never moves (level 6)
  // the maze is always flipped left-to-right (and never upside down): the goal is ALWAYS bottom-left.
  if (hasGoalCorner || random() < 0.5) g.forEach((row) => row.reverse());
  if (!hasGoalCorner && random() < 0.5) g.reverse();
  // Patrollers keep walking the same way (left/right or up/down) after the flip, so nothing else changes.
  return rowsNow();
}

// A CHOKE POINT is a square on the route that is the ONLY way through: if an enemy stands there,
// you can't get past it. For each one, knock down the nearest wall that makes a way around it,
// so there is always a loop to lead an enemy around. (The goal corner keeps its one way in.)
function removeChokePoints(g, route, start, isCornerSquare) {
  const width = g[0].length;
  const height = g.length;
  const isOpen = (x, y) => g[y][x] !== "#";
  const key = (x, y) => y * width + x;

  for (const choke of route) {
    if (isCornerSquare(choke.x, choke.y)) break; // reached the goal corner
    // Which squares can you reach from P without stepping on this square?
    const reached = new Set([key(start.x, start.y)]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const { x, y } = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!isOpen(nx, ny) || reached.has(key(nx, ny)) || (nx === choke.x && ny === choke.y)) continue;
        reached.add(key(nx, ny));
        queue.push({ x: nx, y: ny });
      }
    }
    // Still reach the far side of the route? Then this square is not a choke point.
    const last = route[route.length - 1];
    if (reached.has(key(last.x, last.y))) continue;

    // Find the closest wall between two rooms with P's side on one side and the far side on the other
    let best = null;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (g[y][x] !== "#" || (x % 2) === (y % 2)) continue; // only walls between two rooms
        const [ax, ay, bx, by] = x % 2 === 0 ? [x - 1, y, x + 1, y] : [x, y - 1, x, y + 1];
        if (isCornerSquare(ax, ay) || isCornerSquare(bx, by)) continue;
        const aIn = reached.has(key(ax, ay));
        const bIn = reached.has(key(bx, by));
        if (aIn === bIn) continue;
        const [ox, oy] = aIn ? [bx, by] : [ax, ay];
        if (ox === choke.x && oy === choke.y) continue; // that would just lead back onto the choke point
        const distance = Math.abs(x - choke.x) + Math.abs(y - choke.y);
        if (!best || distance < best.distance) best = { x, y, distance };
      }
    }
    if (best) g[best.y][best.x] = " ";
  }
}

function placeEnemies(g, letters, spots, start, random, isCornerSquare) {
  const isOpen = (x, y) => g[y]?.[x] !== undefined && g[y][x] !== "#";
  const shooterSeesStart = (x, y) => {
    if (x !== start.x && y !== start.y) return false;
    const dx = Math.sign(start.x - x);
    const dy = Math.sign(start.y - y);
    for (let cx = x + dx, cy = y + dy; ; cx += dx, cy += dy) {
      if (!isOpen(cx, cy)) return false;
      if (cx === start.x && cy === start.y) return true;
    }
  };
  // A Patroller walks its whole straight hallway, back and forth. If that hallway has no side
  // openings, you could never get past it, so it needs at least one spot (not at the ends) to duck into.
  const hasSideOpening = (x, y, dx, dy) => {
    let [ax, ay] = [x, y];
    while (isOpen(ax - dx, ay - dy)) [ax, ay] = [ax - dx, ay - dy]; // walk back to one end
    let openings = 0;
    let length = 0;
    for (let cx = ax, cy = ay; isOpen(cx, cy); cx += dx, cy += dy) {
      const isEnd = (cx === ax && cy === ay) || !isOpen(cx + dx, cy + dy);
      if (!isEnd && (isOpen(cx + dy, cy + dx) || isOpen(cx - dy, cy - dx))) openings++;
      length++;
    }
    return length >= 3 && openings >= 1;
  };

  const far = letters.filter((l) => FAR_ENEMIES.includes(l));
  const near = letters.filter((l) => !FAR_ENEMIES.includes(l));
  // Spread each group evenly (with a little wobble) over its part of the route
  const targets = [
    ...near.map((letter, i) => ({ letter, at: (i + 0.5 + (random() - 0.5) * 0.6) / near.length })),
    ...far.map((letter, i) => ({ letter, at: 0.3 + 0.7 * (i + 0.5 + (random() - 0.5) * 0.6) / far.length })),
  ];

  // If the enemies don't fit, let them stand a bit closer together
  const largest = Math.max(3, Math.floor(Math.min(g.length, g[0].length) / 11));
  for (let spacing = largest; spacing >= 1; spacing--) {
    const placed = [];
    const fits = (letter, s) => {
      if (g[s.y][s.x] !== " " || isCornerSquare(s.x, s.y)) return false;
      if (placed.some((p) => Math.abs(p.x - s.x) + Math.abs(p.y - s.y) < spacing)) return false;
      if ((letter === "S" || letter === "M") && shooterSeesStart(s.x, s.y)) return false;
      if (letter === "R") return hasSideOpening(s.x, s.y, 1, 0);
      if (letter === "V") return hasSideOpening(s.x, s.y, 0, 1);
      return true;
    };
    const ok = targets.every(({ letter, at }) => {
      const middle = Math.min(spots.length - 1, Math.floor(at * spots.length));
      for (let d = 0; d < spots.length; d++) {
        for (const i of [middle + d, middle - d]) {
          const routeSquare = spots[i];
          if (!routeSquare) continue;
          // Try the route square itself, then the squares up to 2 steps off the route
          const nearby = [routeSquare];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (!isOpen(routeSquare.x + dx, routeSquare.y + dy)) continue;
            nearby.push({ x: routeSquare.x + dx, y: routeSquare.y + dy });
            if (isOpen(routeSquare.x + 2 * dx, routeSquare.y + 2 * dy)) {
              nearby.push({ x: routeSquare.x + 2 * dx, y: routeSquare.y + 2 * dy });
            }
          }
          // A Patroller that doesn't fit in a left-right hallway can walk up and down instead (and back)
          const options = letter === "R" ? ["R", "V"] : letter === "V" ? ["V", "R"] : [letter];
          for (const square of nearby) {
            const chosen = options.find((l) => fits(l, square));
            if (chosen) {
              g[square.y][square.x] = chosen;
              placed.push(square);
              return true;
            }
          }
        }
      }
      return false;
    });
    if (ok) return true;
    for (const p of placed) g[p.y][p.x] = " "; // take them all back off and try again
  }
  return false;
}

// Mix up a list into a random order
function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}
