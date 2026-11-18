// ===== GAME: the rules =====
// Moving, walls, the goal, enemies catching you, lives, the timer, winning and losing.
// This file never draws anything. It only keeps track of WHERE things are.
// renderer.js reads that and draws it in 3D.

import { CONFIG } from "./config.js";
import { LEVELS } from "./levels.js";
import { parseLevel, isWall, findPath, DIRECTIONS } from "./grid.js";
import { BRAINS, lineOfFire, beamSquares, pullStep } from "./enemies.js";
import { generateLevel, randomSeed } from "./mazegen.js";

// A "mover" is anything that slides from square to square (the player or an enemy).
//   x, y          the square it is on. The RULES only ever look at these.
//   fromX, fromY  the square it is sliding away from
//   progress      0 = just left fromX/fromY, 1 = arrived at x/y. Only used for drawing the slide.
//   pullMs        counts up while a Vortex is pulling it; it gets tugged one square when this is big enough
function makeMover(x, y) {
  return { x, y, startX: x, startY: y, fromX: x, fromY: y, progress: 1, pullMs: 0 };
}

// Begin sliding one square. The mover's square changes RIGHT AWAY,
// and the slide you see on screen catches up over the next few frames.
function startSlide(mover, dx, dy) {
  mover.fromX = mover.x;
  mover.fromY = mover.y;
  mover.x += dx;
  mover.y += dy;
  mover.progress = 0;
}

function sendToStart(mover) {
  mover.x = mover.fromX = mover.startX;
  mover.y = mover.fromY = mover.startY;
  mover.progress = 1;
}

// Where to DRAW a mover: part of the way between its old square and its new one.
// "smooth" eases in and out (enemies). Without it the speed is steady (player),
// so holding a key gives one smooth glide instead of a stop-start wobble.
function drawPosition(mover, smooth) {
  const p = mover.progress;
  const t = smooth ? p * p * (3 - 2 * p) : p;
  return {
    x: mover.fromX + (mover.x - mover.fromX) * t,
    y: mover.fromY + (mover.y - mover.fromY) * t,
  };
}

const seconds = (ms) => (ms / 1000).toFixed(1) + "s";

export class Game {
  constructor({ renderer, hud, input }) {
    this.renderer = renderer;
    this.hud = hud;
    this.input = input;
    this.hud.onPlayAgain(() => this.playAgain());
    this.hud.onDifficulty((key) => this.start(key, this.menuOptions));
  }

  // Show the "pick a difficulty" screen. options can have { seed, level } (used by the ?seed= and ?level= shortcuts).
  chooseDifficulty(options = {}) {
    if (!this.grid) {
      // Draw level 1 behind the menu, so it isn't just an empty screen
      this.setDifficulty("normal");
      this.loadLevel(0);
    }
    this.menuOptions = options;
    this.state = "menu";
    this.hud.setMessage("Pick a difficulty to start!");
    this.hud.showDifficultyMenu(CONFIG.difficulties);
  }

  setDifficulty(key, seed = randomSeed()) {
    this.difficultyKey = key;
    this.difficulty = CONFIG.difficulties[key];
    this.seed = seed; // picks the random mazes (only used when difficulty.randomLayouts is true)
  }

  // Start a brand new game
  start(key = "normal", { seed, level = 1 } = {}) {
    this.setDifficulty(key, seed);
    this.levelTimes = [];
    this.loadLevel(level - 1);
  }

  loadLevel(index) {
    this.levelIndex = index;
    const rows = this.difficulty.randomLayouts ? generateLevel(index, this.seed) : LEVELS[index];
    this.grid = parseLevel(rows);
    this.player = makeMover(this.grid.start.x, this.grid.start.y);
    this.enemies = this.grid.enemies.map((e) => ({
      ...makeMover(e.x, e.y),
      type: e.type,
      dir: e.dir,
      startDir: e.dir,
      stepTimer: 0, // counts up; the enemy steps when it reaches its stepMs
      beam: null,     // Shooters only: the beam they are aiming or firing
      cooldownMs: 0,  // Shooters only: time left before they can aim again
      isMimic: Boolean(e.isMimic), // Mimics change their type (ability) every few seconds
      heldMs: null,   // while a Vortex has swallowed this enemy: how long it has been inside (null = free)
      portalTimerMs: 0, // Portalers only: counts up to the next portal
      isFake: false,  // Deceivers only: a fake can't catch you, and everyone phases through it
    }));
    // Every floor square (a portal can lead to any of them)
    this.floorSquares = [];
    this.grid.rows.forEach((row, y) => [...row].forEach((letter, x) => {
      if (letter !== "#") this.floorSquares.push({ x, y });
    }));
    this.portals = []; // each one: { x, y, exit: { x, y }, owner }
    this.randomizeGoal(this.player);
    this.splitTimerMs = 0;
    this.mimicTimerMs = 0;
    this.copyRandomAbility();
    this.lives = this.difficulty.lives;
    this.timeMs = 0;
    this.graceMs = 0; // while above 0, you can't be caught
    this.state = "playing"; // "menu", "playing", "gameOver" or "won"

    this.input.clear();
    this.renderer.buildLevel(this.grid, CONFIG.camera.levelZoomOut[index + 1] ?? 1);
    this.hud.hideOverlay();
    this.hud.setLevel(index + 1, LEVELS.length, this.difficultyLabel());
    this.hud.setLives(this.lives, this.difficulty.lives);
    this.hud.setTime(0);
    this.hud.setMessage(`Level ${index + 1}: reach the green pad!`);
  }

  // For example "Normal" or "Hard, maze #4821"
  difficultyLabel() {
    return this.difficulty.randomLayouts ? `${this.difficulty.name}, maze #${this.seed}` : this.difficulty.name;
  }

  // Called about 60 times a second. dtMs = milliseconds since last time.
  update(dtMs) {
    if (this.state !== "playing") return; // the timer and enemies pause on pop-up screens

    this.timeMs += dtMs;
    this.graceMs = Math.max(0, this.graceMs - dtMs);

    const levelBefore = this.levelIndex;
    this.updatePlayer(dtMs);
    // Enemies freeze while you blink, and skip the frame where a new level just loaded.
    if (this.state === "playing" && this.levelIndex === levelBefore && this.graceMs === 0) {
      this.updateEnemies(dtMs);
    }
    this.hud.setTime(this.timeMs);
  }

  updatePlayer(dtMs) {
    const p = this.player;

    // Still sliding? Keep sliding. Only pick a new move once we arrive.
    if (p.progress < 1) {
      p.progress = Math.min(1, p.progress + dtMs / CONFIG.playerStepMs);
      if (p.progress < 1) return;
      const atGoal = () => p.x === this.grid.goal.x && p.y === this.grid.goal.y;
      // Arrived. On the goal? You win the level. On a portal? Whoosh! (and maybe it took you to the goal)
      if (atGoal() || (this.usePortal(p) && atGoal())) {
        this.levelComplete();
        return;
      }
    }

    // A Vortex is tugging you: this step goes toward it instead of where you wanted
    if (p.tugToward) {
      const step = pullStep(this.grid, p, p.tugToward, false);
      p.tugToward = null;
      if (step) {
        startSlide(p, step[0], step[1]);
        this.checkCaught();
        return;
      }
    }

    const dir = this.input.nextDirection();
    if (!dir) return;
    const [dx, dy] = dir;
    if (isWall(this.grid, p.x + dx, p.y + dy)) return; // a wall is in the way: don't move

    startSlide(p, dx, dy);
    this.checkCaught(); // did we just walk into an enemy?
  }

  updateEnemies(dtMs) {
    this.updateMimics(dtMs);
    this.updateSplitters(dtMs);
    this.updatePortalers(dtMs);
    if (this.updateVortexes(dtMs)) return; // a Vortex pulled an enemy onto you

    for (const enemy of this.enemies) {
      if (enemy.heldMs !== null) continue; // stuck inside a Vortex
      let stepMs = CONFIG.enemies[enemy.type].stepMs;
      stepMs /= this.difficulty.enemySpeed; // Easy enemies are slower, Hard enemies are faster
      if (enemy.isMimic) stepMs /= CONFIG.enemies.mimic.speedMultiplier; // Mimics are faster than the real thing

      // Enemies slide a bit faster than their step time, so they pause between steps.
      if (enemy.progress < 1) {
        enemy.progress = Math.min(1, enemy.progress + dtMs / (stepMs * 0.7));
        // Just arrived on a portal? Through it goes. (Did it come out right where you are standing?)
        if (enemy.progress === 1 && this.usePortal(enemy) && this.checkCaught()) return;
      }

      // Shooters stand still while they aim and fire
      if (enemy.type === "shooter") {
        const result = this.updateShooter(enemy, dtMs);
        if (result === "hit") return;
        if (result === "busy") continue;
      }

      enemy.stepTimer += dtMs;
      if (enemy.stepTimer < stepMs) continue; // not this enemy's turn yet
      enemy.stepTimer -= stepMs;

      // A Deceiver at an intersection splits and goes down every way at once (even back)
      if (enemy.type === "deceiver" && this.splitDeceiver(enemy)) {
        if (this.checkCaught()) return;
        continue;
      }

      const move = BRAINS[enemy.type](enemy, this.grid, this.player);
      if (move && !this.isBlocked(enemy, enemy.x + move[0], enemy.y + move[1])) {
        startSlide(enemy, move[0], move[1]);
      }
      if (this.checkCaught()) return; // did an enemy just step onto us?
    }
  }

  // MIMICS: every switchMs, all Mimics copy the same random ability (Hunter, Shooter, Ghost or Splitter).
  // A Mimic's "type" IS the ability it copied, so it moves, shoots, splits and looks exactly like that enemy.
  updateMimics(dtMs) {
    if (!this.enemies.some((e) => e.isMimic)) return;
    this.mimicTimerMs += dtMs;
    if (this.mimicTimerMs < CONFIG.enemies.mimic.switchMs) return;
    this.mimicTimerMs -= CONFIG.enemies.mimic.switchMs;
    this.copyRandomAbility();
  }

  copyRandomAbility() {
    // A Mimic can only copy a Shooter on levels that have Shooters (letter S)
    const hasShooters = this.grid.rows.some((row) => row.includes("S"));
    const abilities = CONFIG.enemies.mimic.abilities.filter((a) => a !== "shooter" || hasShooters);
    const ability = abilities[Math.floor(Math.random() * abilities.length)];
    for (const enemy of this.enemies) {
      if (!enemy.isMimic) continue;
      enemy.type = ability;
      enemy.beam = null; // stop any beam it was aiming or firing as a Shooter
      enemy.cooldownMs = 0;
    }
  }

  // SPLITTERS: every splitMs, each Splitter splits into two (1, 2, 4, 8 ... up to max).
  // The new one appears on an empty square next to its parent (or on the parent if there is no room).
  // Splitters inside a Vortex don't split (but still count toward the max).
  updateSplitters(dtMs) {
    const { splitMs, max } = CONFIG.enemies.splitter;
    const splitters = this.enemies.filter((e) => e.type === "splitter");
    const freeSplitters = splitters.filter((e) => e.heldMs === null);
    if (freeSplitters.length === 0) return;

    this.splitTimerMs += dtMs;
    if (this.splitTimerMs < splitMs) return;
    this.splitTimerMs -= splitMs;
    if (splitters.length >= max) return;

    const taken = (x, y) =>
      (x === this.player.x && y === this.player.y) || this.enemies.some((e) => e.x === x && e.y === y);

    for (const parent of freeSplitters.slice(0, max - splitters.length)) {
      const spot = DIRECTIONS
        .map(([dx, dy]) => ({ x: parent.x + dx, y: parent.y + dy }))
        .find((s) => !isWall(this.grid, s.x, s.y) && !taken(s.x, s.y)) ?? parent;
      this.enemies.push({
        ...makeMover(spot.x, spot.y),
        type: "splitter",
        dir: null,
        startDir: null,
        stepTimer: 0,
        beam: null,
        cooldownMs: 0,
        isCopy: true, // copies disappear when you lose a life
        isMimic: parent.isMimic, // a Mimic's copies are Mimics too, and stay when it copies something else
        heldMs: null,
        portalTimerMs: 0,
      });
    }
  }

  // DECEIVERS: wander around the maze (they never follow you). When a Deceiver gets to an intersection
  // (a square with 3 or 4 open sides, not just a hallway or a corner), it splits and one Deceiver goes
  // down EVERY open way, even back the way it came.
  // They all look exactly the same, but only ONE of the group is real. The rest are fakes.
  // A fake that gets to an intersection splits too, and one of ITS group is real, so now there is one more real one!
  // Fakes can't catch you, and everyone phases through them. Never more than `max` Deceivers on a level.
  // Returns true if it split (then everyone in the group has already started walking).
  splitDeceiver(deceiver) {
    const ways = DIRECTIONS.filter(([dx, dy]) => !isWall(this.grid, deceiver.x + dx, deceiver.y + dy));
    const room = CONFIG.enemies.deceiver.max - this.enemies.filter((e) => e.type === "deceiver").length;
    if (ways.length < 3 || room < 1) return false;

    // Shuffle the ways, so if there is only room for a few more Deceivers, it picks random ways
    for (let i = ways.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ways[i], ways[j]] = [ways[j], ways[i]];
    }
    const group = [deceiver];
    for (const dir of ways.slice(1, room + 1)) {
      group.push({
        ...makeMover(deceiver.x, deceiver.y),
        type: "deceiver",
        dir,
        startDir: null,
        stepTimer: deceiver.stepTimer,
        beam: null,
        cooldownMs: 0,
        isCopy: true, // copies disappear when you lose a life
        isMimic: false,
        heldMs: null,
        portalTimerMs: 0,
      });
    }
    deceiver.dir = ways[0];

    // Pick which one is real. Then everyone walks off down their own way.
    const real = group[Math.floor(Math.random() * group.length)];
    for (const member of group) {
      member.isFake = member !== real;
      startSlide(member, member.dir[0], member.dir[1]);
    }
    this.enemies.push(...group.slice(1));
    return true;
  }

  // PORTALERS: every portalMs, each Portaler opens a portal on the square it is standing on.
  // The portal leads to a random floor square anywhere on the maze. Only a faint outline shows
  // where it is, and you can't see where it goes! Each Portaler keeps maxPortals portals at a time.
  updatePortalers(dtMs) {
    const { portalMs, maxPortals, goalSafeRadius } = CONFIG.enemies.portaler;
    for (const portaler of this.enemies) {
      if (portaler.type !== "portaler" || portaler.heldMs !== null) continue;
      portaler.portalTimerMs += dtMs;
      if (portaler.portalTimerMs < portalMs) continue;
      portaler.portalTimerMs -= portalMs;

      // A new portal here replaces any old one on this square
      this.portals = this.portals.filter((p) => !(p.x === portaler.x && p.y === portaler.y));
      const own = this.portals.filter((p) => p.owner === portaler);
      if (own.length >= maxPortals) this.portals.splice(this.portals.indexOf(own[0]), 1); // close the oldest

      // Never lead within goalSafeRadius of the goal, onto another portal, or back onto this square
      const isPortal = (s) => this.portals.some((p) => p.x === s.x && p.y === s.y);
      const { x: goalX, y: goalY } = this.grid.goal;
      const exits = this.floorSquares.filter((s) =>
        Math.hypot(s.x - goalX, s.y - goalY) > goalSafeRadius && !isPortal(s) &&
        !(s.x === portaler.x && s.y === portaler.y));
      if (exits.length === 0) continue;
      const exit = exits[Math.floor(Math.random() * exits.length)];
      this.portals.push({ x: portaler.x, y: portaler.y, exit, owner: portaler });
    }
  }

  // Call this when a mover (you or an enemy) has just arrived on a square.
  // If there is a portal there, it zaps the mover to the portal's exit. Returns true if it did.
  // Portalers don't use portals. You won't come out right on top of an enemy: then the portal doesn't work this time.
  usePortal(mover) {
    if (mover.type === "portaler") return false;
    const portal = this.portals.find((p) => p.x === mover.x && p.y === mover.y);
    if (!portal) return false;
    const { x, y } = portal.exit;
    if (mover === this.player && this.enemies.some((e) => this.isDeadly(e) && e.x === x && e.y === y)) return false;

    mover.x = mover.fromX = x;
    mover.y = mover.fromY = y;
    mover.progress = 1;
    if (mover !== this.player) {
      mover.stepTimer = 0;
      this.turnPatrollerToFit(mover);
    }
    return true;
  }

  // A Patroller dropped into a hallway going the other way turns to walk along it
  turnPatrollerToFit(enemy) {
    if (enemy.type !== "patrol") return;
    const [dx, dy] = enemy.dir;
    if (isWall(this.grid, enemy.x + dx, enemy.y + dy) && isWall(this.grid, enemy.x - dx, enemy.y - dy)) {
      enemy.dir = [dy, dx];
    }
  }

  // VORTEX: pulls you and every other enemy within `radius` squares (straight-line distance) toward it.
  //   - Every so often it tugs you one square closer: the closer you are, the more often.
  //     You walk several squares in the time between tugs, so you can always walk out of it.
  //   - Enemies that get pulled onto it are swallowed (they vanish).
  //   - After holdMs it spits each one back out, releaseAhead squares in front of you on your way to the goal!
  // Returns true if a tug made you get caught.
  updateVortexes(dtMs) {
    const vortexes = this.enemies.filter((e) => e.type === "vortex");
    if (vortexes.length === 0) return false;
    const settings = CONFIG.enemies.vortex;

    // Swallow enemies standing on a Vortex, and let out the ones that have been inside long enough
    for (const enemy of this.enemies) {
      if (enemy.type === "vortex") continue;
      if (enemy.heldMs === null) {
        if (vortexes.some((v) => v.x === enemy.x && v.y === enemy.y)) {
          enemy.heldMs = 0;
          enemy.beam = null;
        }
        continue;
      }
      enemy.heldMs += dtMs;
      if (enemy.heldMs >= settings.holdMs) this.releaseFromVortex(enemy);
    }

    // Pull you and the free enemies toward the nearest Vortex
    const pulled = [this.player, ...this.enemies.filter((e) => e.type !== "vortex" && e.heldMs === null)];
    for (const mover of pulled) {
      const distanceTo = (v) => Math.hypot(v.x - mover.x, v.y - mover.y);
      const vortex = vortexes.reduce((a, b) => (distanceTo(b) < distanceTo(a) ? b : a));
      const distance = distanceTo(vortex);
      if (distance > settings.radius) {
        mover.pullMs = 0;
        if (mover === this.player) this.player.tugToward = null;
        continue;
      }

      mover.pullMs += dtMs;
      const closeness = Math.min(1, Math.max(0, (distance - 1) / (settings.radius - 1))); // 0 = right next to it, 1 = edge
      const everyMs = (settings.pullMsNear + (settings.pullMsFar - settings.pullMsNear) * closeness) / this.difficulty.enemySpeed;
      if (mover.pullMs < everyMs) continue;

      // You are usually in the middle of a step, so updatePlayer does your tug as soon as you arrive
      if (mover === this.player) {
        this.player.tugToward = vortex;
        this.player.pullMs = 0;
        continue;
      }
      // Enemies wait until they have finished sliding (and aren't aiming or firing a beam)
      if (mover.progress < 1 || mover.beam) continue;
      mover.pullMs = 0;

      const step = pullStep(this.grid, mover, vortex, mover.type === "ghost");
      if (!step) continue; // a wall is in the way
      startSlide(mover, step[0], step[1]);
      if (this.checkCaught()) return true;
    }
    return false;
  }

  // Put a swallowed enemy back on the maze, releaseAhead squares in front of you on the way to the goal.
  // If you are too close to the goal for that, it stays inside and tries again next frame.
  releaseFromVortex(enemy) {
    const route = findPath(this.grid, this.player, this.grid.goal) ?? [];
    const free = (s) => !this.enemies.some((e) => e.heldMs === null && e.x === s.x && e.y === s.y);
    // route[0] is 1 square away and the last square is the goal (never put an enemy on the goal)
    const spot = route.slice(CONFIG.enemies.vortex.releaseAhead - 1, -1).find(free);
    if (!spot) return;

    enemy.x = enemy.fromX = spot.x;
    enemy.y = enemy.fromY = spot.y;
    enemy.progress = 1;
    enemy.heldMs = null;
    enemy.stepTimer = 0;
    enemy.pullMs = 0;
    this.turnPatrollerToFit(enemy);
  }

  // SHOOTER: when you are in a straight line with it (up, down, left or right)
  // with no wall in between (no matter how far away), it:
  //   1. AIMS: stops and lights up the squares it will hit (aimMs). Get out of the line!
  //   2. FIRES: the beam is deadly for fireMs. It goes until it hits a wall.
  //   3. RESTS: walks like a Hunter for cooldownMs before it can aim again.
  // Only one Shooter's beam can be on at a time, so they take turns.
  // Returns "hit" if the beam caught you, "busy" while aiming or firing, or "free" to walk.
  updateShooter(enemy, dtMs) {
    const settings = CONFIG.enemies.shooter;
    enemy.cooldownMs = Math.max(0, enemy.cooldownMs - dtMs);

    if (enemy.beam) {
      const beam = enemy.beam;
      beam.timeMs += dtMs;

      if (beam.phase === "aim" && beam.timeMs >= settings.aimMs) {
        beam.phase = "fire";
        beam.timeMs = 0;
      }

      if (beam.phase === "fire") {
        const onBeam = beam.squares.some((s) => s.x === this.player.x && s.y === this.player.y);
        if (onBeam && this.graceMs === 0) {
          this.caught("Zapped by a Shooter!");
          return "hit";
        }
        if (beam.timeMs >= settings.fireMs) {
          enemy.beam = null;
          enemy.cooldownMs = settings.cooldownMs;
          enemy.stepTimer = 0;
        }
      }
      return "busy";
    }

    // Ready to shoot, standing still on a square, and you're in its line of fire?
    // Shooters take turns: none starts aiming while another one's beam is on.
    // (Otherwise two beams could cross and leave you nowhere safe to stand.)
    const anotherBeamIsOn = this.enemies.some((e) => e.beam);
    if (enemy.cooldownMs === 0 && enemy.progress >= 1 && !anotherBeamIsOn) {
      const dir = lineOfFire(this.grid, enemy, this.player);
      if (dir) {
        enemy.beam = { dir, squares: beamSquares(this.grid, enemy, dir), phase: "aim", timeMs: 0 };
        return "busy";
      }
    }
    return "free";
  }

  // Can this enemy step onto square (x, y)?
  // Enemies don't step onto their own kind, or two Chasers would bunch up and look like one.
  // But some enemies pass right through each other:
  //   - Patrollers pass through everyone (and everyone passes through them),
  //     so a Patroller can never block a hallway.
  //   - Hunters and Shooters pass through Chasers (and Chasers through them).
  // So the only enemies that block each other are Chaser + Chaser, and Hunter/Shooter + Hunter/Shooter.
  // Ghosts pass through everyone too, just like they pass through walls.
  // Splitters block each other (and Hunters/Shooters), so their copies spread out.
  // Nobody blocks a Vortex, and a Vortex blocks nobody (stepping onto it just gets you swallowed).
  // Portalers are harmless and pass through everyone (and everyone passes through them).
  // Deceivers pass through everyone and everyone phases through them (the real one too, or you could
  // tell which one is real by watching who bumps into it).
  // Enemies inside a Vortex aren't on the maze, so they don't block anyone.
  isBlocked(enemy, x, y) {
    const passesThrough = (type) =>
      type === "patrol" || type === "ghost" || type === "vortex" || type === "portaler" || type === "deceiver";
    if (passesThrough(enemy.type)) return false;
    const isChaser = enemy.type === "greedy";
    return this.enemies.some((e) =>
      e !== enemy && e.heldMs === null && !passesThrough(e.type) && (e.type === "greedy") === isChaser && e.x === x && e.y === y);
  }

  // Can this enemy catch you right now? Portalers and fake Deceivers are harmless, and enemies inside a Vortex aren't on the maze.
  isDeadly(enemy) {
    return enemy.heldMs === null && enemy.type !== "portaler" && !enemy.isFake;
  }

  // Caught = a deadly enemy and the player are on the same square.
  // We check after EVERY single step (player or enemy), so they can never
  // swap places and slip past each other without one landing on the other.
  checkCaught() {
    if (this.graceMs > 0) return false;
    const hit = this.enemies.some((e) => this.isDeadly(e) && e.x === this.player.x && e.y === this.player.y);
    if (hit) this.caught();
    return hit;
  }

  caught(reason = "Caught!") {
    this.lives -= 1;
    this.hud.setLives(this.lives, this.difficulty.lives);

    if (this.lives <= 0) {
      this.state = "gameOver";
      this.hud.setMessage("Out of lives!");
      this.hud.showOverlay({
        title: "Game Over",
        lines: [`You ran out of lives on level ${this.levelIndex + 1}.`],
        buttonText: `Try Level ${this.levelIndex + 1} Again`,
        kind: "lose",
      });
      return;
    }

    // Everyone goes back to where they started, Splitter and Deceiver copies vanish, Vortexes let go of everything
    // and all portals close
    this.enemies = this.enemies.filter((e) => !e.isCopy);
    this.splitTimerMs = 0;
    this.portals = [];
    sendToStart(this.player);
    this.player.pullMs = 0;
    this.player.tugToward = null;
    for (const enemy of this.enemies) {
      sendToStart(enemy);
      enemy.dir = enemy.startDir;
      enemy.stepTimer = 0;
      enemy.beam = null;
      enemy.cooldownMs = 0;
      enemy.heldMs = null;
      enemy.pullMs = 0;
      enemy.portalTimerMs = 0;
      enemy.isFake = false; // a Deceiver that turned fake when it split is real again
    }
    this.mimicTimerMs = 0;
    this.copyRandomAbility();
    this.randomizeGoal(this.player);
    this.input.clear();
    this.graceMs = this.difficulty.graceMs;
    const left = this.lives === 1 ? "1 life left" : `${this.lives} lives left`;
    this.hud.setMessage(`${reason} Back to the start. ${left}.`);
  }

  // Pick a random floor square that can actually be reached from the player's square.
  // On the levels in CONFIG.fixedGoalLevels the goal never moves: it stays on the G.
  randomizeGoal(from) {
    if (CONFIG.fixedGoalLevels.includes(this.levelIndex + 1)) return;
    const id = (x, y) => y * this.grid.width + x;
    const queue = [{ x: from.x, y: from.y }];
    const visited = new Set([id(from.x, from.y)]);
    const enemySquares = new Set(this.enemies.map((e) => id(e.x, e.y)));
    const candidates = [];

    for (let i = 0; i < queue.length; i++) {
      const square = queue[i];
      const squareId = id(square.x, square.y);
      const isPlayerSquare = square.x === from.x && square.y === from.y;

      if (!isPlayerSquare && !enemySquares.has(squareId)) {
        candidates.push(square);
      }

      for (const [dx, dy] of DIRECTIONS) {
        const next = { x: square.x + dx, y: square.y + dy };
        const nextId = id(next.x, next.y);
        if (!visited.has(nextId) && !isWall(this.grid, next.x, next.y)) {
          visited.add(nextId);
          queue.push(next);
        }
      }
    }

    if (candidates.length === 0) return;
    this.grid.goal = candidates[Math.floor(Math.random() * candidates.length)];
  }

  levelComplete() {
    this.levelTimes[this.levelIndex] = this.timeMs;
    const finished = this.levelIndex + 1;

    if (finished < LEVELS.length) {
      this.loadLevel(this.levelIndex + 1);
      this.hud.setMessage(`Level ${finished} done in ${seconds(this.levelTimes[finished - 1])}! Now level ${finished + 1}.`);
      return;
    }

    this.state = "won";
    this.hud.setMessage("You escaped every maze!");
    this.hud.showOverlay({
      title: "You Win!",
      lines: [
        `Difficulty: ${this.difficultyLabel()}`,
        ...this.levelTimes.map((ms, i) => `Level ${i + 1}: ${seconds(ms)}`).filter(Boolean), // skips levels you jumped past
      ],
      buttonText: "Play Again",
      kind: "win",
    });
  }

  playAgain() {
    if (this.state === "won") this.chooseDifficulty();                // pick a difficulty and start at level 1 (new mazes on Hard)
    else if (this.state === "gameOver") this.loadLevel(this.levelIndex); // retry this level (the same maze on Hard)
  }

  // Everything renderer.js needs to draw one frame
  view() {
    const blinking = this.graceMs > 0 && Math.floor(this.graceMs / 100) % 2 === 1;
    return {
      goal: { x: this.grid.goal.x, y: this.grid.goal.y },
      player: { ...drawPosition(this.player, false), visible: !blinking },
      enemies: this.enemies.map((e) => ({
        ...drawPosition(e, true),
        type: e.type,
        visible: e.heldMs === null, // hidden while inside a Vortex
        // A Shooter's beam starts on the Shooter's square and runs `length` squares in direction `dir`
        beam: e.beam && { x: e.x, y: e.y, dir: e.beam.dir, length: e.beam.squares.length, phase: e.beam.phase },
      })),
      portals: this.portals.map((p) => ({ x: p.x, y: p.y })), // only where they are, not where they go
      // Is a Shade close enough to turn the lights out?
      dark: this.enemies.some((e) => e.type === "shade" && e.heldMs === null &&
        Math.hypot(e.x - this.player.x, e.y - this.player.y) <= CONFIG.enemies.shade.range),
    };
  }
}
