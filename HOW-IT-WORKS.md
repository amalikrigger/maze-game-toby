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
| `M` | Mimic enemy (level 5 and up only) |
| `O` | Vortex enemy (level 6 and up only) |
| `T` | Portaler enemy (level 5 and up only) |
| `D` | Shade enemy |
| `X` | Deceiver enemy (splits at every intersection; only one of each group is real) |
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

### Mimic (`M`): copies other enemies
Every 10 seconds (and once right when the level starts), every Mimic copies the same random
ability: Hunter, Shooter, Ghost or Splitter (never a Patroller or Chaser). The trick is that a
Mimic's `type` simply **becomes** the enemy it copied, so all the normal code for that enemy
(moving, shooting, splitting, blocking and its 3D shape) just works. `isMimic` remembers that it
is really a Mimic. See `updateMimics` and `copyRandomAbility` in `js/game.js`. A Mimic also
moves 1.2 times faster than the enemy it copied (`speedMultiplier` in `config.js`).

If it copies a Splitter, its copies are Mimics too. When it switches to something else, the
copies stay and switch with it. When you lose a life, the copies vanish like Splitter copies do.
The game refuses to start if a level before level 5 has an `M` in it (`firstLevel` in `config.js`).
A Mimic only copies a Shooter on levels that have a Shooter (`S`), so on level 6 it picks from
Hunter, Ghost and Splitter.

### Vortex (`O`): pulls everything in
The Vortex slowly walks toward you like a Hunter (half as fast). Anything within **15 squares**
(straight-line distance, through walls) gets pulled toward it. See `updateVortexes` in `js/game.js`:

- **You** get tugged one square toward it every so often: every 0.45 seconds right next to it,
  every 1.1 seconds at the edge of its pull. You walk about 7 squares a second, so you can always
  walk out of it. The pull goes in a straight line like a magnet (`pullStep` in `js/enemies.js`),
  so a wall in the way stops it.
- **Enemies** get tugged too (Ghosts even through walls). An enemy pulled onto the Vortex is
  **swallowed** and disappears.
- After **5 seconds** inside, the Vortex spits it back out **10 squares in front of you** on your way
  to the goal (`releaseFromVortex`). So watch out when a Vortex eats a Hunter!

Touching the Vortex itself catches you, like any enemy. When you lose a life, it lets go of
everything it swallowed. The game refuses to start if a level before level 6 has an `O` in it.

### Portaler (`T`): makes portals
The Portaler is **harmless**: touching it doesn't cost a life, and everyone walks right through it.
It ignores you and wanders around the maze (`wander` in `js/enemies.js`). Every **5 seconds** it
opens a portal on the square it is standing on (`updatePortalers` in `js/game.js`). The portal leads
to a **random floor square** anywhere on the maze, and all you can see of it is a faint teal ring.

Anyone who walks onto a portal (you or any enemy, but not the Portaler itself) comes out at its
exit (`usePortal`). A portal could throw you far from the goal, or right next to it! Each Portaler
keeps 3 portals; when it opens a 4th, its oldest one closes. To be fair, a portal never drops you
right on top of an enemy (it just doesn't work that time), and never leads onto the goal.
When you lose a life, all portals close. The game refuses to start if a level before level 5 has a `T`.

### Shade (`D`): turns the lights out
The Shade slowly hunts you like a Hunter (a bit slower). When you are **10 squares** or closer to it
(straight-line distance, through walls), the lights go out: you can only see **4 squares** around
you, and the camera zooms back in to normal on level 6. The Shade itself glows, so you can always
see where it is. Get more than 10 squares away and the light comes back.

The game only works out *whether* it is dark (`dark` in `view()` in `js/game.js`). The darkness is
drawn in `js/renderer.js` (`addDarkness`): every material gets a few extra lines of **shader**
code (the tiny programs the graphics card runs for every pixel). For each pixel it measures how far
that spot is from you across the floor, and paints it black if it is more than 4 squares away.

### Deceiver (`X`): which one is real?
The Deceiver never follows you. It wanders like the Portaler: keeps going the same way and never
turns back unless it hits a dead end. But when it gets to an **intersection** (a square with 3 or 4
open sides, not just a hallway or a corner), it splits, and one Deceiver goes down **every** open way
at once, even back the way it came (`splitDeceiver` in `js/game.js`). They all look exactly the same, but only **one** of each group
is real. The others are fakes: they can't catch you, and you and every enemy phase right through them.

Fakes split too! When a fake gets to an intersection, one of its new group is real, so there is one more
real Deceiver than before. To stop them filling the whole maze, there are never more than 16
Deceivers on a level (`max` in `js/config.js`). When you lose a life, all the copies vanish and the
first Deceiver goes back to its start, real again.

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

**Level 6 is 71 wide and 57 tall** (about twice the area of level 5) and is much more of a maze:
long twisty hallways, only a few loops, and no Shooters. Its goal never moves (`fixedGoalLevels`
in `config.js`), and the bottom-left corner around the goal is walled off with only **one** way in.

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
| 6 | 71 x 57 | 5 Mimics, 3 Hunters, 2 Chasers, 4 Patrollers, 1 Splitter | 39 / 40 | 0.55 times |

The robot also played 10 whole games (levels 1 to 5 in a row) and won 9.

Level 2 is tricky: the Chasers pass through Patrollers, so all 4 of them can follow you into the
top-left corner and block the only hallway out. Don't go in there! Level 3 got a bit harder when
Hunters started passing through Chasers, because they can now gang up on you together.

The robot can see the whole maze, but you only see the part near you, so expect it to be harder
for a person. That's what the playtest is for.

### Difficulties (`difficulties` in `js/config.js`)
When the game starts you pick **Easy**, **Normal** or **Hard**. Each one is just a few numbers:
`lives`, `enemySpeed` (every enemy's step time is divided by it), `graceMs` (blinking time after
being caught) and `randomLayouts`. Normal is the game exactly as it was before.

### Random mazes on Hard (`js/mazegen.js`)
On Hard, every level is a brand new maze with the **same size and the same enemies** as the
hand-made level. A **seed** (the maze number) picks the maze: the same seed always makes the same
maze, so **Try Again** gives you the same maze, and `?difficulty=hard&seed=4821` replays maze #4821.

1. **Recursive backtracker:** keep digging from room to room in a random direction. When stuck, go
   back until there is somewhere new to dig. Every square can be reached.
2. **Loops:** knock down some extra walls (`LOOP_CHANCE`, 15 to 25% depending on the level).
3. **No choke points:** a choke point is a square that is the *only* way through. If an enemy
   stands there you can never get past, so for each one on the route, the nearest wall that makes
   a way around it gets knocked down.
4. **Enemies** go on or next to the route from `P` to `G`, spread out, and never close to `P`.
   Ghosts and Mimics only go on the far part of the route. Shooters (and Mimics) are never in a
   straight line with `P`. A Patroller only goes in a hallway with a side opening to duck into.
5. Level 6 still gets its walled-off goal corner with **one** way in.
6. The maze is flipped at random, so you don't always start top-left. Level 6 is always flipped
   the same way, so its goal is **always in the bottom-left corner**.

The test robot (a newer one that can also plan to wait in a side hallway) played 12 random mazes
per level, 3 times each, on Hard. Every single maze was won at least once:

| Level | Robot won on Hard | Robot caught (average) |
| --- | --- | --- |
| 1 | 36 / 36 | 0 times |
| 2 | 35 / 36 | 0.14 times |
| 3 | 32 / 36 | 0.53 times |
| 4 | 33 / 36 | 0.72 times |
| 5 | 26 / 36 | 1.2 times |
| 6 | 30 / 36 | 0.81 times |

Before steps 3 and 4 were added, some random mazes could never be beaten (an enemy blocked the
only hallway, or a Patroller walked a hallway with nowhere to hide). Making 200 mazes per level
takes about 2 ms each for the small levels and 20 ms for level 6, so there is no waiting.

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

The game is always in one of four **states**: `"menu"`, `"playing"`, `"gameOver"` or `"won"`.

- **Lives:** 3 per level (5 on Easy). They reset when you start a new level.
- **Timer:** counts how long you've been on this level. It resets on each new level and stops
  while a pop-up screen is showing.
- **Goal:** when you arrive on the `G` square, the next level loads. After the last level, the
  **You Win!** screen shows your time for each level.
- **Game Over:** when lives reach 0. **Play Again** retries the same level (the same maze on Hard).
- **You Win!:** **Play Again** goes back to the difficulty menu (new random mazes on Hard).

## 7. The 3D drawing (`js/renderer.js`)

three.js draws a **scene** through a **camera**:

- The flat grid is laid on the ground: grid `x` becomes 3D `x`, grid `y` becomes 3D `z`, and 3D `y` is height.
- Each `#` becomes a blue box. All the boxes are drawn in one batch (an `InstancedMesh`) so it runs fast.
- The player is a yellow ball. Chaser = red ball, Hunter = purple diamond, Patroller = orange cube,
  Shooter = cyan cone. A Shooter's beam is one box stretched over the squares it covers.
- A "sun" light makes shadows.
- The camera floats above and behind the player and glides after it. It stops at the edges of the
  maze, so you never see a big empty space.
- On some levels the camera sits higher and further back, so you can see more of the maze. This is
  `levelZoomOut` in `CONFIG.camera` (level 6 uses `1.7`, which shows 1.7 times as much maze across
  and along).

## 8. The game loop (`js/main.js`)

About 60 times a second, the browser calls `frame`, which:
1. works out how much time passed since the last frame,
2. updates the rules (`game.update`),
3. draws the picture (`renderer.render`).

## Things to try

- Change speeds and colors in `js/config.js`.
- Redraw a maze in `js/levels.js`. Break a rule on purpose (make a row too short) and look at the console.
- Put an `H` in level 1 and see how much harder it is than the `E`.
