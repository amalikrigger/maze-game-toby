# How It Works

This explains the code in plain language, so you can describe it in your final document.
The big idea: **the game rules and the 3D drawing are kept separate.**

- The **rules** (in `levels.js`, `grid.js`, `enemies.js`, `game.js`) think of the maze as a
  flat grid of squares, just like the starter game. Nothing there knows about 3D.
- The **drawing** (in `renderer.js`) looks at where everything is on the grid and draws it
  in 3D with three.js.

So you can explain the walls and the enemies without knowing anything about 3D graphics.

---

## 1. Drawing levels with letters (`js/levels.js`, `js/grid.js`)

Each level is a list of text rows:

```
"################",
"#P     #       #",
"# #### # ##### #",
```

| Letter | Meaning |
| --- | --- |
| `#` | wall |
| `P` | where the player starts |
| `G` | the goal |
| `E` | Chaser enemy |
| `H` | Hunter enemy |
| `S` | Shooter enemy |
| `R` / `V` | Patroller (walks left-right / up-down) |
| space | open floor |

`parseLevel` reads every letter and remembers where the start, goal and enemies are.
Each square has an address `(x, y)`: **x** counts across from the left, **y** counts down from the top.
The top-left corner is `(0, 0)`.

**Checking levels for mistakes.** When the game starts, `validateLevel` checks every level:
all rows the same length, the outside edge all `#`, exactly one `P` and one `G`, and a path from
`P` to `G`. If something is wrong, the game stops and explains the problem in the browser console.

## 2. How walls work (`isWall` in `js/grid.js`)

To check for a wall at square `(x, y)`, the game looks up row `y`, letter `x`, and checks
whether it is `#`. Anything off the edge of the map also counts as a wall.

Before the player moves, the game asks: *"Is the square I want to step into a wall?"*
If yes, the player doesn't move. That's all there is to it. The player can never be inside a
wall, because it never steps into one. (This is different from Scratch, where you step and
then step back if you touched the wall color.)

## 3. Smooth movement (`js/game.js`, `js/input.js`)

The rules move the player **one whole square at a time**, like the starter game. To make it
look smooth, every mover (the player or an enemy) remembers:

- `x, y`: the square it is on. **The rules only ever use this.**
- `fromX, fromY`: the square it just left.
- `progress`: goes from 0 to 1 while it slides from the old square to the new one.

When you press a key, `x, y` changes to the new square *right away*, and `progress` starts at 0.
Every frame, `progress` grows a little, and the drawing puts the ball part of the way between
the two squares. When `progress` reaches 1, you have arrived and can move again.

**Holding a key** keeps you moving, because each time you arrive the game checks whether a key
is still held. **Tapping** a key while you're sliding is remembered, and that move happens as
soon as you arrive, so quick taps don't get lost.

## 4. The four enemies (`js/enemies.js`)

Every enemy has a "brain": a function that answers *"Which way should I step?"*
Each enemy type gets a turn every so many milliseconds (`stepMs` in `config.js`).

### Chaser (`E`): greedy AI
This is the AI from the starter game. It looks at the open squares next to it, measures how far
each one is from you (squares across + squares down, ignoring walls), and steps onto the closest one.

**Weakness:** it doesn't understand walls. If a wall is between you, it walks right up to the wall
and gets stuck there, because every other step looks "farther away". Players can use this to escape.

### Hunter (`H`): breadth-first search (BFS)
The Hunter finds the real shortest path through the maze (`findPath` in `grid.js`). BFS works like
a ripple in a pond:

1. Start at the Hunter's square.
2. Look at every square 1 step away. Then every square 2 steps away. Then 3...
3. For each new square, write down which square you came from.
4. When the ripple reaches the player, follow the "came from" notes backwards to get the path.

The Hunter takes the first step of that path, then does the whole search again on its next turn
(because you've probably moved). Walls can't fool it. It is slower than the Chaser to make it fair.

### Patroller (`R` and `V`): back and forth
The Patroller ignores you completely. It walks in a straight line and turns around when the next
square is a wall. Patrollers are placed in hallways that cross your route to the goal, so you
have to time your run past them.

### Shooter (`S`): a Hunter with a beam
The Shooter walks exactly like a Hunter (same BFS brain). Its extra trick is in `updateShooter`
in `js/game.js`. When you are in a **straight line** with it (up, down, left or right) and
**no wall** is in between, no matter how far away you are, it:

1. **Aims** (1 second): it stops, and the squares its beam will hit flash blue on the floor.
   This is your warning. Step out of that line!
2. **Fires** (0.3 seconds): a bright beam fills those squares, all the way to the next wall.
   If you are on one of them, or you walk into it while it is firing, you are zapped and lose a life.
3. **Rests** (1.5 seconds): it walks like a Hunter and can't aim again until the rest is over.

`beamSquares` works out which squares the beam covers: it keeps stepping in the direction until
the next square is a wall. (The outside edge of every maze is wall, so it always stops.)
`lineOfFire` checks the 4 directions and returns the one you are in (or nothing). All the times
are in `config.js` under `shooter`.

**Shooters take turns.** A Shooter won't start aiming while another Shooter's beam is on.
Without this, two beams could cross right where you are standing and leave you nowhere safe to
step. (The test robot found this on level 5, where there are 6 Shooters.)

### Which enemies block each other (`isBlocked` in `js/game.js`)
Without any blocking, Chasers that start near each other would all follow the same steps, end up
on the same square, and look like one enemy. But too much blocking jams the hallways. So:

| | Chaser | Hunter / Shooter | Patroller |
| --- | --- | --- | --- |
| **Chaser** | blocked | passes through | passes through |
| **Hunter / Shooter** | passes through | blocked | passes through |
| **Patroller** | passes through | passes through | passes through |

Blocked means the enemy waits for its next turn instead of stepping onto that square.

### Where the enemies are placed
Levels 1 to 4 are 31 squares wide and 25 tall. **Level 5 is 51 wide and 41 tall** (almost 3 times
the area). The enemies are put on or right next to the route from `P` to `G`, so you have to deal
with them. Level 1 has 4 enemies, level 2 has 7, level 3 has 8 (including 2 Hunters), level 4
has 8 (including 2 Shooters) and level 5 has 15 (6 Shooters and 4 Hunters). The mazes have
**loops** (more than one way around), so you can always lead an enemy around a loop and escape.
Level 5 has no dead ends at all. Levels 4 and 5 were also checked to make sure no single square
on the route is the only way through, and level 4 has twisty, short hallways so a Shooter can't
see you from very far away. The player is about 3 times faster than any enemy.

To make sure every level can be beaten, a test robot played each level many times using the real
game rules. It only looks at the enemies every 0.2 to 0.35 seconds, like a person would, notices a
Shooter's warning only after that same delay, steps out of Shooter lines, and makes a run for it
if it has been stuck for a long time.

| Level | Size | Enemies | Robot won | Robot caught (average) |
| --- | --- | --- | --- | --- |
| 1 | 31 x 25 | 2 Chasers, 2 Patrollers | 64 / 64 | 0.5 times |
| 2 | 31 x 25 | 4 Chasers, 3 Patrollers | 58 / 64 | 0.33 times |
| 3 | 31 x 25 | 2 Hunters, 3 Chasers, 3 Patrollers | 56 / 64 | 1.3 times |
| 4 | 31 x 25 | 2 Shooters, 3 Chasers, 3 Patrollers | 80 / 80 | 0.25 times |
| 5 | 51 x 41 | 6 Shooters, 4 Hunters, 2 Chasers, 3 Patrollers | 79 / 80 | 0.25 times |

The robot also played 10 whole games (levels 1 to 5 in a row) and won 9.

Level 2 is tricky: the Chasers pass through Patrollers, so all 4 of them can follow you into the
top-left corner and block the only hallway out. Don't go in there! Level 3 got a bit harder when
Hunters started passing through Chasers, because they can now gang up on you together.

The robot can see the whole maze, but you only see the part near you, so expect it to be harder
for a person. That's what the playtest is for.

## 5. Getting caught (`checkCaught` in `js/game.js`)

You're caught when an enemy and the player are on the **same square**. The game checks this
after **every single step**, whether you stepped or an enemy stepped. Because only one thing moves at a time,
you can never swap squares with an enemy and slip past it. (The starter game had this bug: if you
walked into the enemy, it didn't count.)

When you're caught:
1. You lose a life.
2. You and all the enemies go back to where you started.
3. For 1 second you blink. You can't be caught, and the enemies wait.

## 6. Lives, timer, winning and losing (`js/game.js`, `js/hud.js`)

The game is always in one of three **states**: `"playing"`, `"gameOver"` or `"won"`.

- **Lives:** 3 per level. They reset when you start a new level.
- **Timer:** counts how long you've been on this level. It resets on each new level and stops
  while a pop-up screen is showing.
- **Goal:** when you arrive on the `G` square, the next level loads. After the last level, the
  **You Win!** screen shows your time for each level.
- **Game Over:** when lives reach 0. **Play Again** retries the same level.

## 7. The 3D drawing (`js/renderer.js`)

three.js draws a **scene** through a **camera**:

- The flat grid is laid on the ground: grid `x` becomes 3D `x`, grid `y` becomes 3D `z`, and 3D `y` is height.
- Each `#` becomes a blue box. All the boxes are drawn in one batch (an `InstancedMesh`) so it runs fast.
- The player is a yellow ball. Chaser = red ball, Hunter = purple diamond, Patroller = orange cube,
  Shooter = cyan cone. A Shooter's beam is one box stretched over the squares it covers.
- A "sun" light makes shadows.
- The camera floats above and behind the player and glides after it. It stops at the edges of the
  maze, so you never see a big empty space.

## 8. The game loop (`js/main.js`)

About 60 times a second, the browser calls `frame`, which:
1. works out how much time passed since the last frame,
2. updates the rules (`game.update`),
3. draws the picture (`renderer.render`).

## Things to try

- Change speeds and colors in `js/config.js`.
- Redraw a maze in `js/levels.js`. Break a rule on purpose (make a row too short) and look at the console.
- Put an `H` in level 1 and see how much harder it is than the `E`.
