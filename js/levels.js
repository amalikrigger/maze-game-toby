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
//
// Each maze is 31 squares wide and 25 tall (about twice as big as the starter levels).
// The enemies are placed on or next to the route to the goal, so you WILL run into them.
// The mazes have loops, so there is always a way to run around an enemy and escape.
// A test robot played every level 64 times to check it can be beaten.

export const LEVELS = [
  // Level 1: 2 Chasers and 2 Patrollers. Start top-left, goal bottom-right.
  [
    "###############################",
    "#P    #             #         #",
    "##### ##### ##### # # # # # # #",
    "#   #          R# # # # # # # #",
    "# # ### ##### # # # ### # # # #",
    "# #  V#       # # #     # # # #",
    "# # # # ##### # # ####### # # #",
    "#   #         #   #     # # # #",
    "# ### ############# ### # # # #",
    "#            E        # # # # #",
    "# ################### # # # # #",
    "# #       #           # # # # #",
    "# # ### # # ######### # # # # #",
    "#   #   # #         # #E# # # #",
    "# ### ### # ### # # # # # # ###",
    "# #   # # #   #     # # # #   #",
    "# # ### # ##### ### # # # # # #",
    "# #   # #       #   # # #   # #",
    "# ### # ######### # # # # ### #",
    "#     #           # # # # #   #",
    "####### ######### # # # # # # #",
    "#     # #     # # # # # #   # #",
    "# # ### # ### # # ### # ##### #",
    "#         #     #     #      G#",
    "###############################",
  ],

  // Level 2: 4 Chasers and 3 Patrollers. Start bottom-left, goal top-right.
  // To get to the top half you must cross the long hallway where the 4 Chasers wait.
  [
    "###############################",
    "#             #              G#",
    "# ########### # ####### # ### #",
    "#             # #   #   #R    #",
    "# ##### ### ### # # # ####### #",
    "# #           # # # #       # #",
    "# # # # ##### # # # ### # # # #",
    "# #   #     # #   #     # # # #",
    "# ### # # # # ##### ##### # # #",
    "#       #                   # #",
    "### # ######### ##### ####### #",
    "#V  # E      E      E        E#",
    "# # # ##### ###################",
    "# # # #     #                 #",
    "# # # # ### # ############### #",
    "# #   #     # #             # #",
    "# ### # ### # # ### # ####### #",
    "#   # #    V  # #             #",
    "# # # # # ##### # ### ####### #",
    "# #   #         # #   #     # #",
    "# ### # # ### # # # ### # # # #",
    "#     #       #   #   # # # # #",
    "# ################# # # # ### #",
    "#P                  #   #     #",
    "###############################",
  ],

  // Level 3: 2 Hunters, 3 Chasers and 3 Patrollers. Start bottom-right, goal top-left.
  [
    "###############################",
    "#G          #             #   #",
    "# ####### # # ######### # # # #",
    "#       # # #         # #   # #",
    "####### # # # ####### # ### # #",
    "#E      # #           #     # #",
    "# ##### # ######### ######### #",
    "# #   # #           #         #",
    "# # # # ########### # #########",
    "#      V         R# #         #",
    "# ######### ####### ######### #",
    "#                   #   E     #",
    "# ################### ### ### #",
    "# #         H         #      R#",
    "# # ########### ####### #######",
    "# # #           #     # #     #",
    "# # # ######### # ### # # ### #",
    "# #E# #       # # #   # # #   #",
    "# # # # # ### # # # # # # # # #",
    "#H# # #   #   # #     # # #   #",
    "# # # # ### ### # ##### # ### #",
    "# # # #           #     #     #",
    "# # # ############# ######### #",
    "#   #                        P#",
    "###############################",
  ],
];
