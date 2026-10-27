# Roadmap

Capstone, Trimester 1, Mr. Krigger. **Due Fri Nov 20, 11:59 PM.**

## School checkpoints

- [ ] **By Fri Oct 23:** new proposal submitted, one level you can move through
- [x] **Oct 26 to 30:** three levels and a win screen (the Must have)
- [x] **Nov 2 to 6:** an enemy that can catch you
- [x] **Nov 9 to 13:** timer, lives, polish. **Nothing new after Fri Nov 13.**
- [ ] **Nov 16 to 20:** playtest with 3 classmates, fix the top 2 problems, write the final document, show it

## Phase 1: Must have + Should have

- [x] Project set up: git, README, three.js saved in `vendor/three` (works offline)
- [x] 3 levels drawn with letters, checked for mistakes when the game starts
- [x] Walls block the player
- [x] Smooth sliding movement, arrow keys and W A S D, hold to keep moving
- [x] 3D view with a camera that follows the player
- [x] Reaching the goal opens the next level
- [x] Win screen after the last level, showing the time for each level, with Play Again
- [x] Enemies: Chaser, Hunter, Patroller and Shooter
- [x] Levels made twice as big (31 x 25) with more enemies placed on the route:
      level 1 has 4, level 2 has 7, level 3 has 8. A test robot beat each level 63 to 64 times out of 64.
- [x] Enemies can't stand on the same square (so they don't merge into one)
- [x] Enemies pass through Patrollers (so a Patroller can't block a hallway)
- [x] Level 4 (31 x 25) with a new enemy, the Shooter: walks like a Hunter, aims a beam
      in a straight line that goes until it hits a wall, warns you for 1 s, then fires.
      Shooters take turns (only one beam on at a time). Robot won 80 / 80.
- [x] Hunters and Shooters pass through Chasers (and Chasers through them)
- [x] Level 5: the big one, 51 x 41, with 6 Shooters, 4 Hunters, 2 Chasers, 3 Patrollers and
      no dead ends. Robot won 79 / 80.
- [x] Getting caught: lose a life, everyone back to the start, 1 second of blinking
- [x] 3 lives per level, Game Over screen, Play Again retries the level
- [x] Timer per level, pauses on pop-up screens
- [x] HOW-IT-WORKS.md for the final document
- [ ] Toby plays all 5 levels by hand and checks the controls and camera feel right
- [ ] Tune speeds in `js/config.js` if the levels are too easy or too hard

## Phase 2: Could have (before the Nov 13 freeze)

- [ ] Title screen with a Start button and how-to-play
- [ ] Sounds: step, caught, level complete, win (Web Audio, no downloads needed)
- [ ] Keys that open doors (new letters, and the level checker must make sure the key is reachable)
- [ ] More levels (the follow camera handles mazes of any size, up to 51 x 41 tested)
- [ ] Best times saved in the browser (localStorage)
- [ ] Touch / swipe controls for phones and tablets
- [ ] Put the game on the Raspberry Pi website for the showcase

## Phase 3: Finish (week of Nov 16)

- [ ] Playtest: 3 classmates play without help. Watch, don't talk, write down where they get stuck.
- [ ] Fix the top 2 problems from the playtest
- [ ] Final document: what it does, how it works (walls + enemies, see HOW-IT-WORKS.md),
      skills used, problems hit (use the playtest notes), what you would add
- [ ] Show it at the showcase

## Not doing

- Online multiplayer
- Story mode

---

## Next session prompt

Copy everything in the box below into a new chat to start Phase 2.

```text
You are an expert game designer and web developer continuing Toby's 3D maze game in
/Users/techmonkey/Development/maze-game-toby. It is a middle-school capstone (Mr. Krigger,
Trimester 1). Feature freeze is Fri Nov 13; final document and showcase due Fri Nov 20, 11:59 PM.

FIRST, read these files completely before suggesting anything:
README.md, ROADMAP.md, HOW-IT-WORKS.md, index.html, css/style.css, and every file in js/.

PROJECT FACTS
- Plain HTML/CSS/JavaScript ES modules. No npm, no bundler, no build step.
- three.js 0.186.1 is saved in vendor/three/ (three.module.js + three.core.js) and loaded through
  an import map in index.html. Keep it offline-friendly: never load anything from a CDN.
- Run: `python3 -m http.server 8000` in the project folder, open http://localhost:8000
  (use 8001 if 8000 is busy). Opening index.html by double-click does NOT work.
- Architecture: the RULES are grid-based and know nothing about 3D; the RENDERER only draws.
  - js/levels.js: ASCII levels with loops so enemies can be escaped. L1-L4 are 31 x 25,
    L5 is 51 x 41.
    Letters: # wall, P start, G goal, E Chaser, H Hunter, S Shooter,
    R Patroller (left-right), V Patroller (up-down), space floor.
    L1: 2E 2 patrol. L2: 4E 3 patrol. L3: 2H 3E 3 patrol. L4: 2S 3E 3 patrol.
    L5: 6S 4H 2E 3 patrol, no dead ends. Enemies sit on/next to the P->G route.
  - js/grid.js: parseLevel, isWall, findPath (BFS), validateLevel (equal rows, border walls,
    one P, one G, P->G reachable). main.js validates all levels at startup.
  - js/enemies.js: BRAINS { greedy, hunter, patrol, shooter (= hunter) }, each returns [dx, dy]
    or null. Also beamSquares and lineOfFire for the Shooter's beam (goes until a wall).
  - js/game.js: Game class. States "playing" | "gameOver" | "won". Movers have x,y (rules),
    fromX,fromY,progress (visual slide). Square changes at slide START; catch checked after
    every player or enemy step. isBlocked: Chaser blocks Chaser, Hunter/Shooter block
    Hunter/Shooter, everything else passes through (Patrollers pass through everyone).
    Shooters (updateShooter): aim 1000 ms (floor flashes), fire 300 ms (deadly), rest 1500 ms,
    only one beam on at a time. Lives 3 per level,
    timer per level, 1s grace after caught
    (enemies frozen, player blinks). view() returns draw positions for the renderer.
  - js/renderer.js: three.js scene, InstancedMesh walls, follow camera clamped to maze edges.
  - js/input.js: arrows + WASD, held keys + one queued tap.
  - js/hud.js: HUD text and the single overlay (Win / Game Over) with Play Again.
  - js/config.js: all tweakable numbers and colors.
- Code style: lots of plain-language comments written for a middle-school student,
  textContent (never innerHTML) for any text shown on the page.
- Testing approach used in Phase 1: copy js/ to a temp folder with {"type":"module"} in
  package.json and run a headless Node simulation of Game with fake renderer/hud/input;
  then take headless Chrome screenshots (--headless=new --use-angle=swiftshader
  --enable-unsafe-swiftshader --screenshot) of a temp copy to check visuals. Don't commit test
  scaffolding.

YOUR TASK: Phase 2 from ROADMAP.md, in this order, one git commit per item, ticking the
ROADMAP checkbox and updating HOW-IT-WORKS.md for each feature:
1. Title screen (Start button, how to play, enemy legend)
2. Sounds with the Web Audio API (generated beeps/tones, no audio files), with a mute toggle
3. Keys and doors (new letters; validator must prove every level is solvable with keys)
4. Two new levels (31 x 25 like levels 1-4, or bigger like level 5) that use keys/doors and all enemy types.
   Any new level must be checked by a bot that plays it many times with the real Game class
   (human-like 250 ms reaction) and wins nearly every time.
5. Best time per level saved in localStorage, shown on the Win screen
6. Touch/swipe controls for phones and tablets
7. Notes for putting the game on the Raspberry Pi website

Before building anything, GRILL ME with clarifying questions (look, feel, difficulty, controls,
what the title screen says, sound style, how keys/doors should work, level sizes, how to save
best times, Pi details). Then show me a plan for approval. Keep the scope tight, and do not
change Phase 1 behavior unless I agree.
```
