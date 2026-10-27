# Maze Game (Toby)

A 3D maze game made with HTML, CSS, JavaScript and [three.js](https://threejs.org).
Capstone, Trimester 1, Mr. Krigger.

## How to run it

The game uses JavaScript modules, so the browser must load it from a local web server.
Double-clicking `index.html` will **not** work.

1. Open a terminal in this folder.
2. Run:

   ```sh
   python3 -m http.server 8000
   ```

3. Open <http://localhost:8000> in Chrome, Safari or Firefox.
4. Press `Ctrl+C` in the terminal to stop the server.

If you see `Address already in use`, another server is already using port 8000.
Use a different number, like `python3 -m http.server 8001`, and open <http://localhost:8001>.

## How to play

- Move with the **arrow keys** or **W A S D**. Hold a key to keep moving.
- Reach the **green pad** to go to the next level.
- Don't get caught by the enemies. You have **3 lives** on each level.
- Finish level 3 to win.

## Project files

| File | What it does |
| --- | --- |
| `index.html` | The page: game canvas, HUD and pop-up screens |
| `css/style.css` | Colors and layout |
| `js/levels.js` | The mazes, drawn with letters |
| `js/grid.js` | Turns letters into a grid, checks walls, finds paths |
| `js/enemies.js` | The three enemy brains |
| `js/game.js` | The rules: moving, catching, lives, timer, winning |
| `js/renderer.js` | Draws everything in 3D with three.js |
| `js/input.js` | Reads the keyboard |
| `js/hud.js` | Updates the level, lives, time and pop-ups |
| `js/config.js` | Numbers you can tweak (speeds, lives, colors) |
| `js/main.js` | Starts everything |
| `vendor/three/` | A saved copy of three.js, so the game works offline |

See [HOW-IT-WORKS.md](HOW-IT-WORKS.md) for an explanation of the code and
[ROADMAP.md](ROADMAP.md) for what is done and what is next.
