// ===== GAME: the rules =====
// Moving, walls, the goal, enemies catching you, lives, the timer, winning and losing.
// This file never draws anything. It only keeps track of WHERE things are.
// renderer.js reads that and draws it in 3D.

import { CONFIG } from "./config.js";
import { LEVELS } from "./levels.js";
import { parseLevel, isWall } from "./grid.js";
import { BRAINS, lineOfFire, beamSquares } from "./enemies.js";

// A "mover" is anything that slides from square to square (the player or an enemy).
//   x, y          the square it is on. The RULES only ever look at these.
//   fromX, fromY  the square it is sliding away from
//   progress      0 = just left fromX/fromY, 1 = arrived at x/y. Only used for drawing the slide.
function makeMover(x, y) {
  return { x, y, startX: x, startY: y, fromX: x, fromY: y, progress: 1 };
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
  }

  // Start a brand new game from level 1
  start() {
    this.levelTimes = [];
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.grid = parseLevel(LEVELS[index]);
    this.player = makeMover(this.grid.start.x, this.grid.start.y);
    this.enemies = this.grid.enemies.map((e) => ({
      ...makeMover(e.x, e.y),
      type: e.type,
      dir: e.dir,
      startDir: e.dir,
      stepTimer: 0, // counts up; the enemy steps when it reaches its stepMs
      beam: null,     // Shooters only: the beam they are aiming or firing
      cooldownMs: 0,  // Shooters only: time left before they can aim again
    }));
    this.lives = CONFIG.lives;
    this.timeMs = 0;
    this.graceMs = 0; // while above 0, you can't be caught
    this.state = "playing"; // "playing", "gameOver" or "won"

    this.input.clear();
    this.renderer.buildLevel(this.grid);
    this.hud.hideOverlay();
    this.hud.setLevel(index + 1, LEVELS.length);
    this.hud.setLives(this.lives, CONFIG.lives);
    this.hud.setTime(0);
    this.hud.setMessage(`Level ${index + 1}: reach the green pad!`);
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
      if (p.x === this.grid.goal.x && p.y === this.grid.goal.y) {
        this.levelComplete();
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
    for (const enemy of this.enemies) {
      const { stepMs } = CONFIG.enemies[enemy.type];

      // Enemies slide a bit faster than their step time, so they pause between steps.
      if (enemy.progress < 1) {
        enemy.progress = Math.min(1, enemy.progress + dtMs / (stepMs * 0.7));
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

      const move = BRAINS[enemy.type](enemy, this.grid, this.player);
      if (move && !this.isBlocked(enemy, enemy.x + move[0], enemy.y + move[1])) {
        startSlide(enemy, move[0], move[1]);
      }
      if (this.checkCaught()) return; // did an enemy just step onto us?
    }
  }

  // SHOOTER: when you are in a straight line with it (up, down, left or right),
  // no more than `range` squares away and with no wall in between, it:
  //   1. AIMS: stops and lights up the squares it will hit (aimMs). Get out of the line!
  //   2. FIRES: the beam is deadly for fireMs. Walls stop it.
  //   3. RESTS: walks like a Hunter for cooldownMs before it can aim again.
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
    if (enemy.cooldownMs === 0 && enemy.progress >= 1) {
      const dir = lineOfFire(this.grid, enemy, this.player, settings.range);
      if (dir) {
        enemy.beam = { dir, squares: beamSquares(this.grid, enemy, dir, settings.range), phase: "aim", timeMs: 0 };
        return "busy";
      }
    }
    return "free";
  }

  // Can this enemy step onto square (x, y)?
  // Enemies don't step onto each other, or two Chasers would bunch up and look like one.
  // Patrollers are the exception: other enemies pass right through them (and they pass
  // through everyone), so a Patroller can never block a hallway.
  isBlocked(enemy, x, y) {
    if (enemy.type === "patrol") return false;
    return this.enemies.some((e) => e !== enemy && e.type !== "patrol" && e.x === x && e.y === y);
  }

  // Caught = an enemy and the player are on the same square.
  // We check after EVERY single step (player or enemy), so they can never
  // swap places and slip past each other without one landing on the other.
  checkCaught() {
    if (this.graceMs > 0) return false;
    const hit = this.enemies.some((e) => e.x === this.player.x && e.y === this.player.y);
    if (hit) this.caught();
    return hit;
  }

  caught(reason = "Caught!") {
    this.lives -= 1;
    this.hud.setLives(this.lives, CONFIG.lives);

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

    // Everyone goes back to where they started
    sendToStart(this.player);
    for (const enemy of this.enemies) {
      sendToStart(enemy);
      enemy.dir = enemy.startDir;
      enemy.stepTimer = 0;
      enemy.beam = null;
      enemy.cooldownMs = 0;
    }
    this.input.clear();
    this.graceMs = CONFIG.graceMs;
    const left = this.lives === 1 ? "1 life left" : `${this.lives} lives left`;
    this.hud.setMessage(`${reason} Back to the start. ${left}.`);
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
      lines: this.levelTimes.map((ms, i) => `Level ${i + 1}: ${seconds(ms)}`),
      buttonText: "Play Again",
      kind: "win",
    });
  }

  playAgain() {
    if (this.state === "won") this.start();                       // back to level 1
    else if (this.state === "gameOver") this.loadLevel(this.levelIndex); // retry this level
  }

  // Everything renderer.js needs to draw one frame
  view() {
    const blinking = this.graceMs > 0 && Math.floor(this.graceMs / 100) % 2 === 1;
    return {
      player: { ...drawPosition(this.player, false), visible: !blinking },
      enemies: this.enemies.map((e) => ({
        ...drawPosition(e, true),
        // A Shooter's beam starts on the Shooter's square and runs `length` squares in direction `dir`
        beam: e.beam && { x: e.x, y: e.y, dir: e.beam.dir, length: e.beam.squares.length, phase: e.beam.phase },
      })),
    };
  }
}
