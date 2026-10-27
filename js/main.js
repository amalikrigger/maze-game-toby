// ===== MAIN: starts everything =====

import { LEVELS } from "./levels.js";
import { validateLevel } from "./grid.js";
import { Renderer } from "./renderer.js";
import { Hud } from "./hud.js";
import { Input } from "./input.js";
import { Game } from "./game.js";

// If this code is running, the page loaded properly, so hide the "did not start" message.
document.getElementById("need-server").hidden = true;

const hud = new Hud();

// Check every level for mistakes before starting
const problems = [];
LEVELS.forEach((rows, i) => {
  validateLevel(rows).forEach((problem) => problems.push(`Level ${i + 1}: ${problem}`));
});

if (problems.length > 0) {
  problems.forEach((problem) => console.error(problem));
  hud.setMessage(`Maze problem! ${problems[0]}. (Open the console to see all problems.)`);
} else {
  const renderer = new Renderer(document.getElementById("stage"));
  const game = new Game({ renderer, hud, input: new Input() });
  game.start();

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
