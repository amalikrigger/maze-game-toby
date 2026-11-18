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
    this.difficultyEl = document.getElementById("difficulty-buttons");
  }

  // difficulty is shown after the level, for example "Level 2 of 6 · Hard, maze #4821"
  setLevel(number, total, difficulty) {
    this.levelEl.textContent = `Level ${number} of ${total} · ${difficulty}`;
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

  // kind is "win", "lose" or "menu" (changes the colors)
  showOverlay({ title, lines, buttonText, kind }) {
    this.titleEl.textContent = title;
    this.linesEl.replaceChildren(...lines.map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
    this.buttonEl.textContent = buttonText;
    this.buttonEl.hidden = false;
    this.difficultyEl.hidden = true;
    this.overlayEl.dataset.kind = kind;
    this.overlayEl.hidden = false;
    this.buttonEl.focus(); // so pressing Enter or Space clicks it
  }

  // The start screen: one button per difficulty instead of the Play Again button
  showDifficultyMenu(difficulties) {
    this.showOverlay({
      title: "Pick a difficulty",
      lines: [
        `Easy: ${difficulties.easy.lives} lives, slower enemies`,
        `Normal: ${difficulties.normal.lives} lives, the levels as they were made`,
        `Hard: ${difficulties.hard.lives} lives, faster enemies, a NEW random maze every game`,
      ],
      buttonText: "",
      kind: "menu",
    });
    this.buttonEl.hidden = true;
    this.difficultyEl.hidden = false;
    this.difficultyEl.querySelector('[data-difficulty="normal"]').focus();
  }

  // callback gets "easy", "normal" or "hard"
  onDifficulty(callback) {
    this.difficultyEl.addEventListener("click", (e) => {
      const key = e.target.closest("button")?.dataset.difficulty;
      if (key) callback(key);
    });
  }

  hideOverlay() {
    this.overlayEl.hidden = true;
  }

  onPlayAgain(callback) {
    this.buttonEl.addEventListener("click", callback);
  }
}
