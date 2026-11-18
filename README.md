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

- First pick a difficulty:
  - **Easy**: 5 lives, enemies are slower.
  - **Normal**: 3 lives, the levels exactly as they were made.
  - **Hard**: 3 lives, enemies are a bit faster, and every level is a **brand new random maze**.
    The maze number is shown at the top (for example "maze #4821"). To play that maze again, add
    `?difficulty=hard&seed=4821` to the end of the address (for example `http://localhost:8000/?difficulty=hard&seed=4821`).
- Move with the **arrow keys** or **W A S D**. Hold a key to keep moving.
- Reach the **green pad** to go to the next level.
- Don't get caught by the enemies. You have **3 lives** on each level (5 on Easy).
- **Shooters** (cyan) zap you in a straight line, all the way to the next wall. When the floor
  flashes blue, step out of that line!
- The **Mimic** (rainbow ? in the list under the game) is on levels 5 and 6. Every 10 seconds it copies
  a random Hunter, Shooter, Ghost or Splitter, looks exactly like it, and moves 1.2 times faster. Watch out!
  (On level 6 there are no Shooters, so it never copies one there.)
- The **Vortex** (pink swirl) is on level 6. It pulls you and the other enemies toward it from up to
  15 squares away (the pink circle on the floor). Keep walking and you can escape! Enemies it
  swallows come back out 5 seconds later, right in front of you.
- The **Portaler** (teal ring) is on levels 5 and 6. It can't hurt you, but every 5 seconds it makes a
  portal that is almost invisible (just a faint teal ring on the floor). Step on one and you (or any
  enemy) get zapped to a random spot on the maze!
- The **Shade** (indigo triangle) is on level 6. Get within 10 squares of it and the lights go out:
  you can only see 4 squares around you, and the camera zooms back in. Run away to get the light back!
- The **Deceiver** (pink capsule) is on level 6. It wanders around and never follows you, but at
  every intersection it splits and goes down every way at once (even back the way it came). Only one of each group is real;
  the fakes can't hurt you and you walk right through them. But you can't tell which is which!
- Level 6 is the giant maze. Its green pad is always in the bottom-left corner (even on Hard), and
  there is only one way into that corner.
- Finish level 6 to win.

## Project files

| File | What it does |
| --- | --- |
| `index.html` | The page: game canvas, HUD and pop-up screens |
| `css/style.css` | Colors and layout |
| `js/levels.js` | The mazes, drawn with letters |
| `js/mazegen.js` | Makes the random mazes for Hard |
| `js/grid.js` | Turns letters into a grid, checks walls, finds paths |
| `js/enemies.js` | The four enemy brains and the Shooter's beam |
| `js/game.js` | The rules: moving, catching, lives, timer, winning |
| `js/renderer.js` | Draws everything in 3D with three.js |
| `js/input.js` | Reads the keyboard |
| `js/hud.js` | Updates the level, lives, time and pop-ups |
| `js/config.js` | Numbers you can tweak (speeds, difficulties, colors) |
| `js/main.js` | Starts everything |
| `vendor/three/` | A saved copy of three.js, so the game works offline |

See [HOW-IT-WORKS.md](HOW-IT-WORKS.md) for an explanation of the code and
[ROADMAP.md](ROADMAP.md) for what is done and what is next.
