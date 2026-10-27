// ===== RENDERER: draws the game in 3D with three.js =====
// The maze grid is laid flat on the ground:
//   grid x (across)  -> 3D x
//   grid y (down)    -> 3D z (toward the camera)
//   3D y is height (up into the air)
// Every square is 1 unit wide, and the middle of square (x, y) is at 3D (x, 0, y).

import * as THREE from "three";
import { CONFIG } from "./config.js";

const PLAYER_RADIUS = 0.32;

export class Renderer {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.colors.background);

    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 100);
    this.cameraLookAt = new THREE.Vector3(); // the point the camera is looking at right now
    this.cameraFocus = new THREE.Vector3();  // the point it wants to look at

    // Lights: a soft sky light from everywhere, plus a "sun" that makes shadows
    this.scene.add(new THREE.HemisphereLight(0xc7d7ff, 0x1a1f2e, 1.4));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun, this.sun.target);

    // Shapes and materials are made once and reused on every level
    const glow = (color, amount) =>
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: amount, roughness: 0.4 });

    this.wallGeometry = new THREE.BoxGeometry(1, CONFIG.wallHeight, 1);
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.colors.wall, roughness: 0.55 });
    this.floorMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.colors.floor, roughness: 0.9 });

    this.goal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32), glow(CONFIG.colors.goal, 0.6));
    this.goal.receiveShadow = true;

    this.player = new THREE.Mesh(new THREE.SphereGeometry(PLAYER_RADIUS, 32, 16), glow(CONFIG.colors.player, 0.3));
    this.player.castShadow = true;
    this.scene.add(this.player);

    // Each enemy type gets its own shape, so players can tell them apart
    this.enemyLooks = {
      greedy: { geometry: new THREE.SphereGeometry(0.32, 32, 16), height: 0.32 },
      hunter: { geometry: new THREE.OctahedronGeometry(0.38), height: 0.4 },
      patrol: { geometry: new THREE.BoxGeometry(0.55, 0.55, 0.55), height: 0.3 },
      shooter: { geometry: new THREE.ConeGeometry(0.34, 0.7, 6), height: 0.35 },
    };
    for (const [type, look] of Object.entries(this.enemyLooks)) {
      look.material = glow(CONFIG.enemies[type].color, 0.35);
    }

    // Shooter beams. One 1x1x1 box, stretched to the right size each frame.
    //   aim  = a flashing strip on the floor showing which squares are about to be hit
    //   fire = a bright, tall beam
    this.beamGeometry = new THREE.BoxGeometry(1, 1, 1);
    const beamColor = CONFIG.enemies.shooter.color;
    this.beamAimMaterial = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.4, depthWrite: false });
    this.beamFireMaterial = new THREE.MeshBasicMaterial({ color: "#e0faff", transparent: true, opacity: 0.9 });
    this.beamMeshes = [];

    this.levelGroup = null;
    this.enemyMeshes = [];
    this.clock = 0;

    // Keep the picture the right size when the window changes size
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // Build the 3D maze for a level (and throw away the old one)
  buildLevel(grid) {
    if (this.levelGroup) {
      this.scene.remove(this.levelGroup);
      this.floor.geometry.dispose();
      this.walls.dispose();
    }
    this.levelGroup = new THREE.Group();

    // Floor: one big flat rectangle under the whole maze
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(grid.width, grid.height), this.floorMaterial);
    this.floor.rotation.x = -Math.PI / 2; // lay it flat
    this.floor.position.set((grid.width - 1) / 2, 0, (grid.height - 1) / 2);
    this.floor.receiveShadow = true;
    this.levelGroup.add(this.floor);

    // Walls: one box per #. "Instanced" means the computer draws all the boxes in one go (fast).
    const wallSquares = [];
    grid.rows.forEach((row, y) => [...row].forEach((letter, x) => {
      if (letter === "#") wallSquares.push({ x, y });
    }));
    this.walls = new THREE.InstancedMesh(this.wallGeometry, this.wallMaterial, wallSquares.length);
    const place = new THREE.Matrix4();
    wallSquares.forEach(({ x, y }, i) => {
      place.makeTranslation(x, CONFIG.wallHeight / 2, y);
      this.walls.setMatrixAt(i, place);
    });
    this.walls.castShadow = true;
    this.walls.receiveShadow = true;
    this.levelGroup.add(this.walls);

    this.goal.position.set(grid.goal.x, 0.05, grid.goal.y);
    this.levelGroup.add(this.goal);

    // Enemies, in the same order as the game's enemy list
    this.enemyMeshes = grid.enemies.map((enemy) => {
      const look = this.enemyLooks[enemy.type];
      const mesh = new THREE.Mesh(look.geometry, look.material);
      mesh.castShadow = true;
      mesh.position.set(enemy.x, look.height, enemy.y);
      this.levelGroup.add(mesh);
      return mesh;
    });

    // A beam for every Shooter (null for other enemies)
    this.beamMeshes = grid.enemies.map((enemy) => {
      if (enemy.type !== "shooter") return null;
      const beam = new THREE.Mesh(this.beamGeometry, this.beamAimMaterial);
      beam.visible = false;
      this.levelGroup.add(beam);
      return beam;
    });

    this.scene.add(this.levelGroup);
    this.levelWidth = grid.width;
    this.levelHeight = grid.height;

    // Point the sun at the middle of the maze and make its shadows cover the whole maze
    const centerX = (grid.width - 1) / 2;
    const centerZ = (grid.height - 1) / 2;
    const size = Math.max(grid.width, grid.height) * 0.75;
    // The sun is far away (same direction as before) so its shadows reach every corner of big mazes too
    this.sun.position.set(centerX - 15, 42, centerZ + 18);
    this.sun.target.position.set(centerX, 0, centerZ);
    Object.assign(this.sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 120 });
    this.sun.shadow.camera.updateProjectionMatrix();

    // Jump the player and camera straight to the start (no flying across the map)
    this.player.position.set(grid.start.x, PLAYER_RADIUS, grid.start.y);
    this.updateCameraFocus();
    this.cameraLookAt.copy(this.cameraFocus);
    this.camera.position.copy(this.cameraTarget());
    this.camera.lookAt(this.cameraLookAt);
  }

  // The camera looks at the player, but stops before the edge of the maze,
  // so the screen isn't half empty when you're in a corner.
  updateCameraFocus() {
    const { height, distanceBack, edgeMargin } = CONFIG.camera;

    // Keep value between low and high. If the maze is too small for that, use the middle.
    const keepInside = (value, low, high) => (low > high ? (low + high) / 2 : Math.min(Math.max(value, low), high));

    const p = this.player.position;
    const focusZ = keepInside(p.z, edgeMargin, this.levelHeight - 1 - edgeMargin);

    // How many squares the camera can see from the middle of the screen to its left/right edge,
    // measured on the player's row. Rows closer to the camera show fewer squares across.
    const distance = Math.hypot(height, distanceBack);
    const depth = distance - Math.max(0, p.z - focusZ) * (distanceBack / distance);
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfVisibleWidth = depth * Math.tan(halfFov) * this.camera.aspect;

    this.cameraFocus.set(
      keepInside(p.x, halfVisibleWidth - 0.5, this.levelWidth - 0.5 - halfVisibleWidth),
      0,
      focusZ,
    );
  }

  // Where the camera wants to be: above and behind the focus point
  cameraTarget() {
    const { height, distanceBack } = CONFIG.camera;
    const f = this.cameraFocus;
    return new THREE.Vector3(f.x, height, f.z + distanceBack);
  }

  // Stretch a beam box over the squares the Shooter is aiming at (or firing at)
  drawBeam(mesh, beam) {
    mesh.visible = Boolean(beam && beam.length > 0);
    if (!mesh.visible) return;

    const [dx, dy] = beam.dir;
    const firing = beam.phase === "fire";
    const width = firing ? 0.3 : 0.9;   // a thin bright beam, or a wide floor strip
    const height = firing ? 0.3 : 0.04;
    mesh.material = firing ? this.beamFireMaterial : this.beamAimMaterial;

    // The beam covers squares 1..length away from the Shooter, so its middle is (length + 1) / 2 away
    mesh.scale.set(dx !== 0 ? beam.length : width, height, dy !== 0 ? beam.length : width);
    mesh.position.set(
      beam.x + (dx * (beam.length + 1)) / 2,
      firing ? 0.35 : 0.03,
      beam.y + (dy * (beam.length + 1)) / 2,
    );
  }

  // Draw one frame
  render(dtMs, view) {
    const dt = dtMs / 1000;
    this.clock += dt;

    this.player.position.set(view.player.x, PLAYER_RADIUS, view.player.y);
    this.player.visible = view.player.visible;

    view.enemies.forEach((enemy, i) => {
      const mesh = this.enemyMeshes[i];
      mesh.position.x = enemy.x;
      mesh.position.z = enemy.y;
      mesh.rotation.y += dt * 2; // spin, just for looks

      const beamMesh = this.beamMeshes[i];
      if (beamMesh) this.drawBeam(beamMesh, enemy.beam);
    });

    // Make the aim warning flash fast so it gets your attention
    this.beamAimMaterial.opacity = 0.35 + Math.sin(this.clock * 20) * 0.2;

    // Make the goal gently pulse so it is easy to spot
    this.goal.material.emissiveIntensity = 0.5 + Math.sin(this.clock * 4) * 0.3;

    // Camera follow: each frame, move part of the way toward the target.
    // This makes the camera glide behind the player instead of jerking.
    this.updateCameraFocus();
    const amount = 1 - Math.exp(-CONFIG.camera.followSpeed * dt);
    this.camera.position.lerp(this.cameraTarget(), amount);
    this.cameraLookAt.lerp(this.cameraFocus, amount);
    this.camera.lookAt(this.cameraLookAt);

    this.renderer.render(this.scene, this.camera);
  }
}
