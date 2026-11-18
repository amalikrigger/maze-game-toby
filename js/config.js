// ===== CONFIG: numbers you can tweak =====
// Change a number, save, and refresh the browser to see what happens.
// Times are in milliseconds (1000 ms = 1 second). Smaller = faster.

export const CONFIG = {
  playerStepMs: 140,   // how long the player takes to slide one square
  fixedGoalLevels: [6], // on these levels the green pad always stays on the G (on other levels it moves to a random spot)

  // You pick one of these when the game starts.
  //   lives         lives you get on each level
  //   enemySpeed    1 = normal speed, 0.8 = a bit slower, 1.2 = a bit faster (every enemy)
  //   graceMs       after being caught, you blink and can't be caught for this long
  //   randomLayouts true = a brand new random maze for every level (see js/mazegen.js)
  difficulties: {
    easy:   { name: "Easy",   lives: 5, enemySpeed: 0.8, graceMs: 1500, randomLayouts: false },
    normal: { name: "Normal", lives: 3, enemySpeed: 1.0, graceMs: 1000, randomLayouts: false },
    hard:   { name: "Hard",   lives: 3, enemySpeed: 1.1, graceMs: 800,  randomLayouts: true },
  },

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
    ghost: { stepMs: 500, color: "#e2e8f0" },  // Ghost (letter W): same speed as a Hunter, goes through walls
    splitter: {                                // Splitter (letter B): a Hunter that splits in two
      stepMs: 500,
      color: "#84cc16",
      splitMs: 5000,   // every Splitter splits into two this often (they stay the same speed)
      max: 64,         // never more than this many Splitters on a level
    },
    vortex: {                                  // Vortex (letter O): pulls you and other enemies in, only on level 6 and up
      stepMs: 1000,      // it slowly hunts you (half as fast as a Hunter)
      color: "#d946ef",
      radius: 15,        // it pulls anything this many squares away or closer
      pullMsNear: 450,   // right next to it, it tugs you one square closer this often...
      pullMsFar: 1100,   // ...and at the edge of its pull only this often. You walk much faster, so you can escape!
      holdMs: 5000,      // an enemy it sucks in comes back out after this long...
      releaseAhead: 10,  // ...this many squares ahead of you, on your way to the goal
      firstLevel: 6,     // the letter O is not allowed on levels before this one
    },
    portaler: {                                // Portaler (letter T): wanders around making portals, only on level 5 and up
      stepMs: 600,
      color: "#2dd4bf",
      portalMs: 5000,    // every Portaler makes a new portal this often, on the square it is standing on
      maxPortals: 3,     // each Portaler keeps this many portals; making a new one closes its oldest
      goalSafeRadius: 15, // a portal never leads to a square this close (straight-line) to the goal
      firstLevel: 5,     // the letter T is not allowed on levels before this one
    },
    shade: {                                   // Shade (letter D): brings the dark
      stepMs: 650,       // it slowly hunts you (a bit slower than a Hunter)
      color: "#6366f1",
      range: 10,         // when you are this many squares away or closer, the lights go out...
      lightRadius: 4,    // ...and you can only see this many squares around you
    },
    deceiver: {                                // Deceiver (letter X): wanders, and splits at every intersection
      stepMs: 550,
      color: "#f472b6",
      max: 16,           // never more than this many Deceivers (real ones + fakes) on a level
    },
    mimic: {                                   // Mimic (letter M): copies another enemy, only on level 5 and up
      switchMs: 10000,   // every Mimic copies a new random ability this often (all Mimics switch together)
      abilities: ["hunter", "shooter", "ghost", "splitter"], // what it can copy (never Patroller or Chaser)
      speedMultiplier: 1.2, // a Mimic moves this many times faster than the enemy it copied
      firstLevel: 5,     // the letter M is not allowed on levels before this one
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
    // Zoom out on some levels so you can see more of the maze: { level: amount }.
    // 1.7 = the camera is 1.7 times farther away, so you see 1.7 times as far in every direction.
    levelZoomOut: { 6: 1.7 },
  },
};
