// ===== HUD: updates the info bar and the pop-up screens =====

export class Hud {
  constructor() {
    this.levelEl = document.getElementById("level");
    this.livesEl = document.getElementById("lives");
    this.timeEl = document.getElementById("time");
    this.msgEl = document.getElementById("msg");
    this.overlayEl = document.getElementById("overlay");
    this.titleEl = document.getElementById("overlay-title");
    this.linesEl = document.getElementById("overlay-lines");
    this.buttonEl = document.getElementById("play-again");
  }

  setLevel(number, total) {
    this.levelEl.textContent = `Level ${number} of ${total}`;
  }

  setLives(lives, max) {
    this.livesEl.textContent = "♥".repeat(lives) + "♡".repeat(max - lives);
    this.livesEl.setAttribute("aria-label", `${lives} lives`);
  }

  setTime(ms) {
    const text = `Time: ${(ms / 1000).toFixed(1)}s`;
    if (this.timeEl.textContent !== text) this.timeEl.textContent = text;
  }

  setMessage(text) {
    this.msgEl.textContent = text;
  }

  // kind is "win" or "lose" (changes the colors)
  showOverlay({ title, lines, buttonText, kind }) {
    this.titleEl.textContent = title;
    this.linesEl.replaceChildren(...lines.map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
    this.buttonEl.textContent = buttonText;
    this.overlayEl.dataset.kind = kind;
    this.overlayEl.hidden = false;
    this.buttonEl.focus(); // so pressing Enter or Space clicks it
  }

  hideOverlay() {
    this.overlayEl.hidden = true;
  }

  onPlayAgain(callback) {
    this.buttonEl.addEventListener("click", callback);
  }
}
