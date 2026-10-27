// ===== GRID: turns the letters of a level into a maze the game can use =====
// The maze is a grid of squares. x counts across (left to right), y counts down (top to bottom).
// Square (0, 0) is the top-left corner.

// Which letters are enemies, and what kind of enemy each one is.
// "dir" is the direction a Patroller starts walking: [dx, dy].
export const ENEMY_LETTERS = {
  E: { type: "greedy" },
  H: { type: "hunter" },
  R: { type: "patrol", dir: [1, 0] }, // starts walking right
  V: { type: "patrol", dir: [0, 1] }, // starts walking down
};

// The four ways you can step: up, down, left, right
export const DIRECTIONS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

const KNOWN_LETTERS = "#PG " + Object.keys(ENEMY_LETTERS).join("");

// Read the letters of a level and find the start, the goal and the enemies.
export function parseLevel(rows) {
  const grid = {
    rows,
    width: rows[0].length,
    height: rows.length,
    start: null,
    goal: null,
    enemies: [],
  };
  rows.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      if (letter === "P") grid.start = { x, y };
      if (letter === "G") grid.goal = { x, y };
      if (ENEMY_LETTERS[letter]) grid.enemies.push({ x, y, ...ENEMY_LETTERS[letter] });
    });
  });
  return grid;
}

// Is there a wall at square (x, y)? Anything off the edge of the map counts as a wall.
export function isWall(grid, x, y) {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return true;
  return grid.rows[y][x] === "#";
}

// BREADTH-FIRST SEARCH (BFS): finds the shortest path from one square to another.
// It works like a ripple in a pond: first it looks at every square 1 step away,
// then every square 2 steps away, and so on, until it reaches the target.
// It remembers which square it came from, so it can trace the path back.
// Returns a list of squares to walk through (not including "from"), or null if there is no path.
export function findPath(grid, from, to) {
  const id = (x, y) => y * grid.width + x; // a unique number for each square
  const cameFrom = new Map([[id(from.x, from.y), null]]);
  const queue = [{ x: from.x, y: from.y }];

  for (let i = 0; i < queue.length; i++) {
    const square = queue[i];

    if (square.x === to.x && square.y === to.y) {
      // Found it! Walk backwards from the target to build the path.
      const path = [];
      for (let s = square; s !== null && !(s.x === from.x && s.y === from.y); s = cameFrom.get(id(s.x, s.y))) {
        path.push(s);
      }
      return path.reverse();
    }

    for (const [dx, dy] of DIRECTIONS) {
      const next = { x: square.x + dx, y: square.y + dy };
      if (!isWall(grid, next.x, next.y) && !cameFrom.has(id(next.x, next.y))) {
        cameFrom.set(id(next.x, next.y), square);
        queue.push(next);
      }
    }
  }
  return null; // no path exists
}

// Check a level for mistakes. Returns a list of problems (empty list = all good).
export function validateLevel(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return ["it has no rows"];

  const problems = [];
  const width = rows[0].length;

  rows.forEach((row, y) => {
    if (row.length !== width) {
      problems.push(`row ${y + 1} is ${row.length} letters long, but row 1 is ${width}`);
    }
    [...row].forEach((letter, x) => {
      if (!KNOWN_LETTERS.includes(letter)) {
        problems.push(`row ${y + 1} has an unknown letter "${letter}" at position ${x + 1}`);
      }
    });
  });
  if (problems.length > 0) return problems;

  rows.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      const onEdge = y === 0 || y === rows.length - 1 || x === 0 || x === width - 1;
      if (onEdge && letter !== "#") {
        problems.push(`the outside edge must be all #, but row ${y + 1} position ${x + 1} is "${letter}"`);
      }
    });
  });

  const count = (letter) => rows.join("").split(letter).length - 1;
  if (count("P") !== 1) problems.push(`it needs exactly one P, but has ${count("P")}`);
  if (count("G") !== 1) problems.push(`it needs exactly one G, but has ${count("G")}`);
  if (problems.length > 0) return problems;

  const grid = parseLevel(rows);
  if (!findPath(grid, grid.start, grid.goal)) {
    problems.push("there is no path from P to G (a wall is blocking the way)");
  }
  return problems;
}
