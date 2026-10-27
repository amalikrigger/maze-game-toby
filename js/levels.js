// ===== LEVELS: draw your mazes with letters =====
//
//   #  wall               P  player start        G  goal
//   E  Chaser enemy       H  Hunter enemy
//   R  Patroller that walks left and right
//   V  Patroller that walks up and down
//   (space)  open floor
//
// Rules (the game checks these when it starts and tells you in the console if one is broken):
//   - Every row in a level must be the same length.
//   - The outside edge must be all #.
//   - Each level needs exactly one P and exactly one G.
//   - There must be a path from P to G.

export const LEVELS = [
  // Level 1: no enemies. Learn the controls.
  [
    "################",
    "#P     #       #",
    "# #### # ##### #",
    "# #    #     # #",
    "# # ######## # #",
    "# #        # # #",
    "# ######## # # #",
    "#        #   # #",
    "######## ##### #",
    "#              #",
    "# ##############",
    "#             G#",
    "################",
  ],

  // Level 2: one Chaser (E). It is not very smart and gets stuck behind walls.
  [
    "################",
    "#P   #     #   #",
    "# ## # ### # # #",
    "#  #   #     # #",
    "## ##### ##### #",
    "#      #     # #",
    "# #### # ### # #",
    "# #E   #   #   #",
    "# ######## ### #",
    "#        #   # #",
    "######## # # # #",
    "#          #  G#",
    "################",
  ],

  // Level 3: a Hunter (H) that finds its way around walls,
  // and a Patroller (V) guarding the hallway to the goal.
  [
    "################",
    "#P             #",
    "# ############ #",
    "# #          # #",
    "# # ######## # #",
    "# # #H     # # #",
    "# # # #### # # #",
    "# #   #  # #   #",
    "# #####V## ### #",
    "#       #      #",
    "####### # ######",
    "#G      #      #",
    "################",
  ],
];
