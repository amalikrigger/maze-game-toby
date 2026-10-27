// ===== CONFIG: numbers you can tweak =====
// Change a number, save, and refresh the browser to see what happens.
// Times are in milliseconds (1000 ms = 1 second). Smaller = faster.

export const CONFIG = {
  lives: 3,            // lives you get on each level
  playerStepMs: 140,   // how long the player takes to slide one square
  graceMs: 1000,       // after being caught, you blink and can't be caught for this long

  // One entry for each kind of enemy
  enemies: {
    greedy: { stepMs: 450, color: "#ef4444" }, // Chaser (letter E)
    hunter: { stepMs: 500, color: "#a855f7" }, // Hunter (letter H)
    patrol: { stepMs: 350, color: "#f97316" }, // Patroller (letters R and V)
    shooter: {                                 // Shooter (letter S)
      stepMs: 600,
      color: "#22d3ee",
      aimMs: 1000,       // warning time: the squares light up before it fires (the beam goes until a wall)
      fireMs: 300,       // how long the beam stays deadly
      cooldownMs: 1500,  // rest time before it can aim again
    },
  },

  colors: {
    background: "#0b1020",
    floor: "#1e293b",
    wall: "#3b82f6",
    goal: "#22c55e",
    player: "#facc15",
  },

  wallHeight: 0.8, // in squares (1 = as tall as a square is wide)

  camera: {
    fov: 50,          // how wide the camera sees, in degrees
    height: 14,       // how high above the player
    distanceBack: 9,  // how far behind (south of) the player
    followSpeed: 6,   // how quickly the camera catches up with the player
    edgeMargin: 6,    // going up/down, the camera stops following this many squares from the maze edge
  },
};
