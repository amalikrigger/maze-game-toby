// ===== MAIN: starts everything =====

import { LEVELS } from "./levels.js";
import { validateLevel } from "./grid.js";
import { CONFIG } from "./config.js";
import { Renderer } from "./renderer.js";
import { Hud } from "./hud.js";
import { Input } from "./input.js";
import { Game } from "./game.js";

// If this code is running, the page loaded properly, so hide the "did not start" message.
document.getElementById("need-server").hidden = true;

const hud = new Hud();

// Check every level for mistakes before starting
// (some enemies are only allowed from a certain level on)
const lateEnemies = [
  { letter: "M", name: "Mimic", firstLevel: CONFIG.enemies.mimic.firstLevel },
  { letter: "O", name: "Vortex", firstLevel: CONFIG.enemies.vortex.firstLevel },
  { letter: "T", name: "Portaler", firstLevel: CONFIG.enemies.portaler.firstLevel },
];
const problems = [];
LEVELS.forEach((rows, i) => {
  validateLevel(rows).forEach((problem) => problems.push(`Level ${i + 1}: ${problem}`));
  for (const { letter, name, firstLevel } of lateEnemies) {
    if (i + 1 < firstLevel && rows.join("").includes(letter)) {
      problems.push(`Level ${i + 1}: the ${name} (${letter}) can only be on level ${firstLevel} and up`);
    }
  }
});

if (problems.length > 0) {
  problems.forEach((problem) => console.error(problem));
  hud.setMessage(`Maze problem! ${problems[0]}. (Open the console to see all problems.)`);
} else {
  const renderer = new Renderer(document.getElementById("stage"));
  const game = new Game({ renderer, hud, input: new Input() });

  // Testing shortcuts you can add to the address:
  //   ?level=6                         start on level 6
  //   ?difficulty=hard                 skip the menu
  //   ?difficulty=hard&seed=4821       play random maze #4821 again
  const params = new URLSearchParams(location.search);
  const options = {};
  const level = Number(params.get("level"));
  if (Number.isInteger(level) && level >= 1 && level <= LEVELS.length) options.level = level;
  const seed = Number(params.get("seed"));
  if (Number.isInteger(seed) && seed > 0) options.seed = seed;
  const difficulty = params.get("difficulty");

  if (Object.hasOwn(CONFIG.difficulties, difficulty)) game.start(difficulty, options);
  else game.chooseDifficulty(options);

  // The game loop: update the rules, then draw, about 60 times a second
  let lastTime = performance.now();
  function frame(now) {
    // Keep the step between 0 and 100 ms. The first frame can report a time slightly
    // before lastTime (negative), and switching tabs can make a huge jump.
    const dtMs = Math.min(Math.max(now - lastTime, 0), 100);
    lastTime = now;
    game.update(dtMs);
    renderer.render(dtMs, game.view());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
