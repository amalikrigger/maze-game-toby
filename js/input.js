// ===== INPUT: reads the keyboard =====
// Arrow keys and W A S D both work. Holding a key keeps you moving.
// If you tap a key while you are still sliding, that move is remembered
// and happens as soon as the slide finishes (so quick taps never get lost).

const KEY_DIRECTIONS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export class Input {
  constructor() {
    this.held = [];     // keys being held down, newest last
    this.queued = null; // the latest tapped direction, waiting to be used

    window.addEventListener("keydown", (e) => {
      const dir = KEY_DIRECTIONS[e.code];
      if (!dir) return;
      e.preventDefault(); // stop the arrow keys from scrolling the page
      if (e.repeat) return; // ignore the computer's automatic key repeat
      this.held = this.held.filter((code) => code !== e.code);
      this.held.push(e.code);
      this.queued = dir;
    });

    window.addEventListener("keyup", (e) => {
      this.held = this.held.filter((code) => code !== e.code);
    });

    // If the window loses focus we never hear the keyup, so forget every key.
    window.addEventListener("blur", () => this.clear());
  }

  // Which way should the player go next? (null = stand still)
  nextDirection() {
    const newestHeld = this.held[this.held.length - 1];
    const dir = this.queued ?? KEY_DIRECTIONS[newestHeld] ?? null;
    this.queued = null;
    return dir;
  }

  clear() {
    this.held = [];
    this.queued = null;
  }
}
