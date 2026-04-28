// ============================================================
// WHIMSICAL ISLAND ADVENTURE — Main Game Engine
// ============================================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PALETTE, ISLANDS, getIsland } from './world.js';
import { Player } from './player.js';
import { ParticleSystem } from './particles.js';
import { initAudio, startExploreMusic, sfxCrystalCollect, sfxLanternPulse,
         sfxFootstep, sfxDialogue, sfxShrine, sfxClick, sfxWin, toggleMute, isMuted,
         setIslandAudio } from './audio.js';

// ── State ────────────────────────────────────────────────────
let state = 'title'; // title | playing | dialogue | map | win
let currentIslandId = 0;
let audioReady = false;
const keys = {};
const isMobile = navigator.maxTouchPoints > 0 || window.innerWidth < 768;
let joystickDir = { x: 0, z: 0 };

// ── Three.js ─────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const camD = 10;
const camera = new THREE.OrthographicCamera(-camD*aspect, camD*aspect, camD, -camD, 0.1, 200);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

// ── Camera shake ──────────────────────────────────────────────
let shakeTimer = 0, shakeIntensity = 0;

// ── Scene objects ─────────────────────────────────────────────
let player, particles, islandMeshes = [], crystalMeshes = [], npcMeshes = [], shrineMesh;
let crystalLights = []; // track glow lights per crystal for removal
let questItemMeshes = []; // Mochi cat + water jar on island 3
let questIndicators = []; // floating ?/✓ above NPCs
let crystalOrbits = [], shadowCreep, shadowCreepMesh;
let questState = { find_cat: false, fetch_water: false, mochi_found: false, jar_held: false };
let inventoryItems = [];
let pulseRevealTimer = 0;

// ── Guardian Star ─────────────────────────────────────────────
let guardianStarMesh = null, guardianStarLight = null, guardianStarGlowMesh = null;
let guardianStarAngle = 0;

// ── Shrine beam ───────────────────────────────────────────────
let shrinBeamMesh = null;

// ── Combo crystal ─────────────────────────────────────────────
let crystalComboTimestamps = [];

// ── Mobile proximity rings ────────────────────────────────────
let proximityRingMeshes = []; // {mesh, target, pulsing}

// ── Island bounds (computed from tiles) ───────────────────────
let islandBoundarySet = new Set(); // "x,z" strings of valid ground tiles
let islandGroundTiles = []; // [{x,z}] for boundary checking

// ── Dialogue ──────────────────────────────────────────────────
const dialogueBox  = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');
const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueContinue = document.getElementById('dialogue-continue');
let dialogueQueue = [], dialogueCallback = null, typewriterTimer = null, currentLine = '', fullLine = '';

// ── HUD ───────────────────────────────────────────────────────
function updateCrystalHUD(pulse) {
  const island = getIsland(currentIslandId);
  const count = island.crystalCount;
  for (let i = 0; i < 5; i++) {
    const gem = document.getElementById('gem'+i);
    gem.innerHTML = count > i
      ? `<svg viewBox="0 0 22 26"><polygon points="11,1 21,8 21,18 11,25 1,18 1,8" fill="#9B9AE2" stroke="#4F4261" stroke-width="1.2"/><polygon points="11,1 17,7 11,12 5,7" fill="#C6C3DC" opacity="0.7"/><circle cx="7" cy="5" r="2" fill="white" opacity="0.5"/></svg>`
      : `<svg viewBox="0 0 22 26"><polygon points="11,1 21,8 21,18 11,25 1,18 1,8" fill="none" stroke="#C6C3DC" stroke-width="1.5"/></svg>`;
  }
  document.getElementById('crystal-label').textContent = `Crystals ${count}/5`;
  if (pulse) {
    const hud = document.getElementById('hud-crystals');
    hud.style.transition = 'transform 0.12s ease';
    hud.style.transform = 'scale(1.35)';
    setTimeout(() => { hud.style.transform = 'scale(1.0)'; }, 130);
  }
}

function showHUD(show) {
  document.getElementById('hud-crystals').style.display = show ? 'flex' : 'none';
  document.getElementById('hud-compass').style.display = show ? 'block' : 'none';
  document.getElementById('inventory').style.display = show ? 'flex' : 'none';
  document.getElementById('sound-toggle').style.display = show ? 'block' : 'none';
  document.getElementById('map-btn').style.display = show ? 'block' : 'none';
  document.getElementById('ability-bar').style.display = show ? 'flex' : 'none';
}

// ── Save / Load ───────────────────────────────────────────────
function saveGame() {
  try {
    const data = {
      currentIslandId,
      islands: ISLANDS.map(i => ({ unlocked: i.unlocked, restored: i.restored, crystalCount: i.crystalCount }))
    };
    localStorage.setItem('lanternIsle_save', JSON.stringify(data));
  } catch(e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('lanternIsle_save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    data.islands.forEach((d, i) => {
      if (ISLANDS[i]) {
        ISLANDS[i].unlocked = d.unlocked;
        ISLANDS[i].restored = d.restored;
        ISLANDS[i].crystalCount = d.crystalCount;
      }
    });
    return data.currentIslandId || 0;
  } catch(e) { return false; }
}

// ── Island fade transition ────────────────────────────────────
const fadeOverlay = document.getElementById('fade-overlay');
function fadeOut(cb) {
  fadeOverlay.style.transition = 'opacity 0.4s ease';
  fadeOverlay.style.opacity = '1';
  setTimeout(cb, 420);
}
function fadeIn() {
  fadeOverlay.style.transition = 'opacity 0.5s ease';
  setTimeout(() => { fadeOverlay.style.opacity = '0'; }, 60);
}

// ── Floating [Space] prompt ───────────────────────────────────
const ePrompt = document.getElementById('e-prompt');
function updateEPrompt() {
  if (state !== 'playing' || !player) { ePrompt.style.display = 'none'; return; }
  const pp = player.pos;
  const island = getIsland(currentIslandId);
  let nearTarget = null, minDist = Infinity;

  crystalMeshes.forEach(cm => {
    const d = pp.distanceTo(cm.position);
    if (d < 1.8 && d < minDist) { minDist = d; nearTarget = cm.position.clone(); }
  });
  npcMeshes.forEach(nm => {
    const d = pp.distanceTo(nm.position);
    if (d < 1.8 && d < minDist) { minDist = d; nearTarget = nm.position.clone().add(new THREE.Vector3(0, 0.6, 0)); }
  });
  const shrPos = new THREE.Vector3(island.shrinePos.x, 0.6, island.shrinePos.z);
  const sd = pp.distanceTo(shrPos);
  if (sd < 1.8 && sd < minDist) { minDist = sd; nearTarget = shrPos.clone().add(new THREE.Vector3(0, 0.4, 0)); }

  if (!nearTarget) { ePrompt.style.display = 'none'; return; }

  const projected = nearTarget.clone().project(camera);
  const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
  const sx = projected.x * hw + hw;
  const sy = -projected.y * hh + hh;
  ePrompt.style.display = 'block';
  ePrompt.style.left = sx + 'px';
  ePrompt.style.top = (sy - 36) + 'px';
}

// ── Guardian Star ─────────────────────────────────────────────
function buildGuardianStar() {
  if (guardianStarMesh) { scene.remove(guardianStarMesh); scene.remove(guardianStarLight); if (guardianStarGlowMesh) scene.remove(guardianStarGlowMesh); }
  const restoredCount = ISLANDS.filter(i => i.restored).length;
  const brightness = 0.2 + restoredCount * 0.16;
  const geo = new THREE.IcosahedronGeometry(0.22 + restoredCount * 0.04, 1);
  const mat = new THREE.MeshLambertMaterial({
    color: 0xFFFFCC, emissive: 0xFFFF88, emissiveIntensity: brightness
  });
  guardianStarMesh = new THREE.Mesh(geo, mat);
  guardianStarMesh.position.set(0, 15, 0);
  scene.add(guardianStarMesh);
  const glowGeo = new THREE.IcosahedronGeometry(0.38 + restoredCount * 0.06, 0);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA, transparent: true, opacity: 0.18, depthWrite: false });
  guardianStarGlowMesh = new THREE.Mesh(glowGeo, glowMat);
  guardianStarGlowMesh.position.set(0, 15, 0);
  scene.add(guardianStarGlowMesh);
  guardianStarLight = new THREE.PointLight(0xFFFFCC, brightness * 0.6, 40);
  guardianStarLight.position.set(0, 15, 0);
  scene.add(guardianStarLight);
}

// ── Shrine beam ───────────────────────────────────────────────
function buildShrineBeam(island) {
  if (shrinBeamMesh) { scene.remove(shrinBeamMesh); shrinBeamMesh = null; }
  if (island.crystalCount < island.totalCrystals) return;
  const geo = new THREE.CylinderGeometry(0.08, 0.28, 12, 8, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: 0xFFDD55, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  shrinBeamMesh = new THREE.Mesh(geo, mat);
  shrinBeamMesh.position.set(island.shrinePos.x, 6, island.shrinePos.z);
  scene.add(shrinBeamMesh);
}

function removeShrineBeam() {
  if (shrinBeamMesh) { scene.remove(shrinBeamMesh); shrinBeamMesh = null; }
}

// ── Quest Indicator Builder ───────────────────────────────────
function buildQuestIndicator(npcMesh, npc) {
  // Floating ? or ✓ sprite above NPC head
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hasDoneQuest = npc.quest && npc.quest.done;
  ctx.fillStyle = hasDoneQuest ? '#7BDD90' : '#FFD84A';
  ctx.fillText(hasDoneQuest ? '✓' : '?', 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.45, 0.45, 0.45);
  sprite.position.set(npcMesh.position.x, 1.5, npcMesh.position.z);
  sprite.userData = { npcRef: npc, bobBase: 1.5 };
  scene.add(sprite);
  questIndicators.push({ mesh: sprite, npc });
}

// ── Quest Item Meshes (Island 3) ─────────────────────────────
function buildQuestItems(islandId) {
  if (islandId !== 3) return;
  // Mochi the cat — orange sphere body, pointy ears, tail
  const catGroup = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xF4883A })
  );
  body.position.y = 0.18;
  catGroup.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xF4883A })
  );
  head.position.set(0, 0.38, 0.08);
  catGroup.add(head);
  // Ears (two small cones)
  [-1,1].forEach(side => {
    const ear = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.09, 6),
      new THREE.MeshLambertMaterial({ color: 0xF4883A })
    );
    ear.position.set(side * 0.08, 0.51, 0.07);
    catGroup.add(ear);
  });
  // Eyes
  [-1,1].forEach(side => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x222244, emissive: 0x4466AA, emissiveIntensity: 0.5 })
    );
    eye.position.set(side * 0.05, 0.41, 0.19);
    catGroup.add(eye);
  });
  // Tail (curved cylinder)
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 0.22, 6),
    new THREE.MeshLambertMaterial({ color: 0xF4883A })
  );
  tail.position.set(0.16, 0.22, -0.1);
  tail.rotation.z = -0.8;
  catGroup.add(tail);
  // Glow ring to make it interactable-looking
  const ringGeo = new THREE.RingGeometry(0.22, 0.30, 20);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xFFAA33, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.01;
  ring.userData.isPulseRing = true;
  catGroup.add(ring);
  catGroup.position.set(-2, 0, 2);
  catGroup.userData = { type: 'mochi_cat', bobBase: 0, bobOffset: Math.random()*Math.PI*2 };
  scene.add(catGroup);
  questItemMeshes.push(catGroup);

  // Water jar — cylinder with a handle arc
  const jarGroup = new THREE.Group();
  const jar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 0.28, 10),
    new THREE.MeshLambertMaterial({ color: 0x7EC0D4, emissive: 0x336688, emissiveIntensity: 0.2 })
  );
  jar.position.y = 0.14;
  jarGroup.add(jar);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.1, 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0xA8D8EA })
  );
  lid.position.y = 0.31;
  jarGroup.add(lid);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x5A9EB5 })
  );
  handle.position.set(0.12, 0.16, 0);
  handle.rotation.z = Math.PI/2;
  jarGroup.add(handle);
  // Glow ring
  const jRingGeo = new THREE.RingGeometry(0.18, 0.25, 20);
  const jRingMat = new THREE.MeshBasicMaterial({ color: 0x7EC0D4, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const jRing = new THREE.Mesh(jRingGeo, jRingMat);
  jRing.rotation.x = -Math.PI/2;
  jRing.position.y = 0.01;
  jRing.userData.isPulseRing = true;
  jarGroup.add(jRing);
  jarGroup.position.set(3, 0, -1);
  jarGroup.userData = { type: 'water_jar', bobBase: 0, bobOffset: Math.random()*Math.PI*2 };
  scene.add(jarGroup);
  questItemMeshes.push(jarGroup);
}

// ── NPC Mesh Builder (thematic shapes) ───────────────────────
function buildNPCMesh(npc) {
  const g = new THREE.Group();
  const type = npc.type || 'villager';

  if (type === 'crab') {
    // Body: flattened red sphere
    const bodyGeo = new THREE.SphereGeometry(0.18, 8, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.y = 0.55;
    body.position.y = 0.18;
    g.add(body);
    // Claws (two small boxes)
    const clawGeo = new THREE.BoxGeometry(0.1, 0.07, 0.07);
    const clawMat = new THREE.MeshLambertMaterial({ color: npc.color });
    [-1, 1].forEach(side => {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(side * 0.28, 0.16, 0.04);
      claw.rotation.z = side * 0.4;
      g.add(claw);
    });
    // Eyes on stalks
    const eyeStalkGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 5);
    const eyeGeo = new THREE.SphereGeometry(0.045, 6, 5);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const stalkMat = new THREE.MeshLambertMaterial({ color: npc.color });
    [-0.08, 0.08].forEach(ox => {
      const stalk = new THREE.Mesh(eyeStalkGeo, stalkMat);
      stalk.position.set(ox, 0.33, 0.12);
      g.add(stalk);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.4, 0.12);
      g.add(eye);
    });
    // Legs (4 small rods)
    const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4);
    for (let i = 0; i < 4; i++) {
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(legGeo, stalkMat);
        leg.position.set(side * (0.2 + i*0.04), 0.08, -0.04 + i*0.04);
        leg.rotation.z = side * (0.5 + i*0.15);
        g.add(leg);
      });
    }

  } else if (type === 'owl') {
    // Rounded body
    const bodyGeo = new THREE.SphereGeometry(0.2, 8, 7);
    const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.y = 1.3;
    body.position.y = 0.26;
    g.add(body);
    // Head
    const headGeo = new THREE.SphereGeometry(0.17, 8, 7);
    const headMat = new THREE.MeshLambertMaterial({ color: npc.color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.6;
    g.add(head);
    // Ear tufts
    const tuftGeo = new THREE.ConeGeometry(0.05, 0.12, 5);
    const tuftMat = new THREE.MeshLambertMaterial({ color: npc.color });
    [-0.08, 0.08].forEach(ox => {
      const tuft = new THREE.Mesh(tuftGeo, tuftMat);
      tuft.position.set(ox, 0.76, 0);
      g.add(tuft);
    });
    // Big round eyes
    const eyeGeo = new THREE.SphereGeometry(0.065, 7, 7);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    const pupilGeo = new THREE.SphereGeometry(0.033, 6, 6);
    const pupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [-0.07, 0.07].forEach(ox => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.62, 0.14);
      g.add(eye);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(ox, 0.62, 0.175);
      g.add(pupil);
    });
    // Beak
    const beakGeo = new THREE.ConeGeometry(0.04, 0.08, 5);
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xEBB21A });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI/2;
    beak.position.set(0, 0.585, 0.19);
    g.add(beak);
    // Wings
    const wingGeo = new THREE.SphereGeometry(0.12, 6, 5);
    const wingMat = new THREE.MeshLambertMaterial({ color: npc.color });
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.scale.set(0.5, 1.1, 0.6);
      wing.position.set(side * 0.22, 0.28, 0);
      wing.rotation.z = side * 0.3;
      g.add(wing);
    });

  } else if (type === 'fairy') {
    // Tiny glowing body
    const bodyGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color, emissive: npc.color, emissiveIntensity: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.42;
    g.add(body);
    // Wings (flat diamond shapes)
    const wingGeo = new THREE.PlaneGeometry(0.22, 0.16);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    [[-0.18, 0.1], [0.18, -0.05]].forEach(([ox, oz], i) => {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(ox, 0.44, oz);
      wing.rotation.y = (i===0 ? -0.5 : 0.5);
      wing.rotation.z = (i===0 ? 0.3 : -0.3);
      g.add(wing);
    });
    // Glow point
    const gl = new THREE.PointLight(npc.color, 0.5, 1.8);
    gl.position.y = 0.42;
    g.add(gl);
    // Head
    const headGeo = new THREE.SphereGeometry(0.09, 7, 7);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xF5E0D0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.56;
    g.add(head);

  } else if (type === 'wisp') {
    // Glowing orb
    const orbGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const orbMat = new THREE.MeshLambertMaterial({ color: npc.color, emissive: npc.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 0.46;
    g.add(orb);
    // Inner core
    const coreGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.46;
    g.add(core);
    // Tail trail (small sphere below)
    const tailGeo = new THREE.SphereGeometry(0.07, 7, 7);
    const tailMat = new THREE.MeshLambertMaterial({ color: npc.color, transparent: true, opacity: 0.45 });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.y = 0.28;
    g.add(tail);
    const gl = new THREE.PointLight(npc.color, 0.6, 2.5);
    gl.position.y = 0.46;
    g.add(gl);

  } else if (type === 'rock') {
    // Chunky rock shape — stacked irregular boxes
    const mat = new THREE.MeshLambertMaterial({ color: npc.color });
    [[0,0,0,0.28,0.26,0.26],[0.05,0.22,0.02,0.2,0.18,0.2],[-0.04,0.36,-0.03,0.16,0.14,0.15]].forEach(([x,y,z,w,h,d]) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * 0.4;
      g.add(mesh);
    });
    // Small glint eye
    const eyeGeo = new THREE.SphereGeometry(0.03, 5, 5);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFCC });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0.05, 0.38, 0.14);
    g.add(eye);

  } else if (type === 'spirit') {
    // Ghost-like flame shape
    const bodyGeo = new THREE.ConeGeometry(0.14, 0.38, 7);
    const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color, emissive: npc.color, emissiveIntensity: 0.5, transparent: true, opacity: 0.82 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.38;
    g.add(body);
    // Head orb
    const headGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFE8E0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.65;
    g.add(head);
    // Dot eyes
    const eyeGeo = new THREE.SphereGeometry(0.03, 5, 5);
    const eyeMat = new THREE.MeshLambertMaterial({ color: npc.color, emissive: npc.color, emissiveIntensity: 1.0 });
    [-0.05, 0.05].forEach(ox => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.67, 0.11);
      g.add(eye);
    });
    const gl = new THREE.PointLight(npc.color, 0.4, 2.0);
    gl.position.y = 0.5;
    g.add(gl);

  } else if (type === 'log') {
    // Driftwood — horizontal cylinder
    const logGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.55, 8);
    const logMat = new THREE.MeshLambertMaterial({ color: npc.color });
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI/2.3;
    log.position.set(0, 0.16, 0);
    g.add(log);
    // Ring knots
    const knotGeo = new THREE.TorusGeometry(0.12, 0.015, 6, 12);
    const knotMat = new THREE.MeshLambertMaterial({ color: 0x8B6040 });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.rotation.z = Math.PI/2.3;
    knot.position.set(-0.1, 0.16, 0);
    g.add(knot);
    // Small sprouting leaf
    const leafGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x6F9E4A });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.set(1, 0.5, 0.7);
    leaf.position.set(0.18, 0.28, 0.04);
    g.add(leaf);
    // Eye (tiny)
    const eyeGeo = new THREE.SphereGeometry(0.025, 5, 5);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0.05, 0.24, 0.15);
    g.add(eye);

  } else {
    // villager / elder — friendly humanoid capsule with face
    const bodyGeo = new THREE.CapsuleGeometry(0.13, 0.22, 4, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.36;
    g.add(body);
    // Head
    const headGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xF5E6D0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.63;
    g.add(head);
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 5, 5);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    [-0.05, 0.05].forEach(ox => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.645, 0.11);
      g.add(eye);
    });
    // Smile line
    const smileGeo = new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI);
    const smileMat = new THREE.MeshLambertMaterial({ color: 0x994444 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, 0.61, 0.12);
    smile.rotation.x = -0.3;
    smile.rotation.z = Math.PI;
    g.add(smile);
    // Hat (for elder type: pointy cone)
    if (type === 'elder') {
      const hatGeo = new THREE.ConeGeometry(0.1, 0.22, 7);
      const hatMat = new THREE.MeshLambertMaterial({ color: 0x4F4261 });
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.y = 0.83;
      g.add(hat);
      const brimGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.025, 10);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.y = 0.73;
      g.add(brim);
    }
  }

  // Interaction glow ring (always present, pulses when player is near)
  const ringGeo = new THREE.RingGeometry(0.22, 0.30, 20);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xFFDD55, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.02;
  ring.userData.isInteractRing = true;
  g.add(ring);

  return g;
}

// ── Build Island ──────────────────────────────────────────────
function buildIsland(islandId) {
  // Clear previous
  islandMeshes.forEach(m => scene.remove(m));
  crystalMeshes.forEach(m => scene.remove(m));
  crystalLights.forEach(l => scene.remove(l));
  npcMeshes.forEach(m => scene.remove(m));
  if (shrineMesh) scene.remove(shrineMesh);
  if (shadowCreepMesh) scene.remove(shadowCreepMesh);
  removeShrineBeam();
  proximityRingMeshes.forEach(r => scene.remove(r.mesh));
  proximityRingMeshes = [];
  if (particles) particles.clearAll();
  crystalOrbits = [];
  crystalLights = [];
  islandMeshes = []; crystalMeshes = []; npcMeshes = [];
  questItemMeshes.forEach(m => scene.remove(m)); questItemMeshes = [];
  questIndicators.forEach(q => scene.remove(q.mesh)); questIndicators = [];

  const island = getIsland(islandId);
  scene.background = new THREE.Color(island.skyTop);
  scene.fog = new THREE.Fog(island.fogColor, island.fogNear, island.fogFar);

  // Build boundary set from ground tiles
  islandGroundTiles = island.tiles.filter(t => t.type === 'ground');
  islandBoundarySet = new Set(islandGroundTiles.map(t => `${t.x},${t.z}`));

  // Lighting
  scene.children.filter(c=>c.isLight).forEach(l=>scene.remove(l));
  const ambient = new THREE.AmbientLight(island.ambientColor, island.ambientInt);
  const sun = new THREE.DirectionalLight(island.sunColor, island.sunInt);
  sun.position.set(20, 30, 20);
  const hemi = new THREE.HemisphereLight(island.skyTop, island.groundColor, 0.4);
  scene.add(ambient, sun, hemi);

  // Sky gradient plane
  const skyGeo = new THREE.PlaneGeometry(200, 200);
  const skyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(island.skyTop) });
  const skyPlane = new THREE.Mesh(skyGeo, skyMat);
  skyPlane.rotation.x = -Math.PI/2; skyPlane.position.y = -1;
  scene.add(skyPlane); islandMeshes.push(skyPlane);

  // Terrain tiles
  const tileGeo = new THREE.BoxGeometry(0.95, 0.3, 0.95);
  island.tiles.forEach(tile => {
    const isWater = tile.type === 'water';
    const color = isWater
      ? (islandId === 1 ? 0x9BC8D4 : islandId === 4 ? 0x2A4A6B : 0x8AAABB)
      : island.groundColor;
    const mat = new THREE.MeshLambertMaterial({ color, transparent: isWater, opacity: isWater?0.78:1 });
    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.position.set(tile.x, isWater ? -0.18 : 0, tile.z);
    scene.add(mesh); islandMeshes.push(mesh);

    if (!isWater && Math.random() < 0.22 && (tile.x!==0||tile.z!==0)) {
      const fh = 0.18+Math.random()*0.22;
      const fGeo = new THREE.SphereGeometry(0.18+Math.random()*0.12, 6, 5);
      const fCol = islandId===1?0x7EC87E:islandId===2?0xF29FD7:islandId===5?0x9B9AE2:island.groundColor;
      const fMat = new THREE.MeshLambertMaterial({ color: fCol });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.set(tile.x+(Math.random()-0.5)*0.5, 0.3+fh*0.5, tile.z+(Math.random()-0.5)*0.5);
      fMesh.userData = { bobOffset: Math.random()*Math.PI*2, bobBase: fMesh.position.y };
      scene.add(fMesh); islandMeshes.push(fMesh);
    }
  });

  // Crystals — skip hidden ones until gated NPC quest is resolved
  island.crystalPositions.forEach((cp, i) => {
    if (island.crystalCount > i) return; // Already collected
    if (cp.hidden) return; // Hidden until NPC quest reveals it
    spawnCrystal(cp, i, island);
  });

  // Shrine
  const shrGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
  const shrMat = new THREE.MeshLambertMaterial({ color: PALETTE.goldenYellowN, emissive: 0x886600, emissiveIntensity: 0.3 });
  shrineMesh = new THREE.Mesh(shrGeo, shrMat);
  shrineMesh.position.set(island.shrinePos.x, 0.3, island.shrinePos.z);
  if (island.restored) { shrMat.emissive.set(PALETTE.goldenYellowN); shrMat.emissiveIntensity = 0.7; }
  scene.add(shrineMesh);
  const shrLight = new THREE.PointLight(PALETTE.goldenYellowN, 0.6, 3);
  shrLight.position.set(island.shrinePos.x, 1, island.shrinePos.z);
  scene.add(shrLight); islandMeshes.push(shrLight);

  // Mobile shrine proximity ring
  if (isMobile) {
    const sRingGeo = new THREE.RingGeometry(0.5, 0.6, 24);
    const sRingMat = new THREE.MeshBasicMaterial({ color: PALETTE.goldenYellowN, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const sRing = new THREE.Mesh(sRingGeo, sRingMat);
    sRing.rotation.x = -Math.PI/2;
    sRing.position.set(island.shrinePos.x, 0.05, island.shrinePos.z);
    scene.add(sRing);
    proximityRingMeshes.push({ mesh: sRing, target: new THREE.Vector3(island.shrinePos.x, 0, island.shrinePos.z), phase: 0 });
  }

  buildShrineBeam(island);

  // NPCs — thematic meshes
  island.npcs.forEach((npc, ni) => {
    const nMesh = buildNPCMesh(npc);
    nMesh.position.set(npc.x, 0, npc.z);
    nMesh.userData = { npcIdx: ni, bobBase: 0, bobOffset: Math.random()*Math.PI*2 };
    scene.add(nMesh); npcMeshes.push(nMesh);
    if (isMobile) {
      const nRingGeo = new THREE.RingGeometry(0.28, 0.36, 20);
      const nRingMat = new THREE.MeshBasicMaterial({ color: npc.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      const nRing = new THREE.Mesh(nRingGeo, nRingMat);
      nRing.rotation.x = -Math.PI/2;
      nRing.position.set(npc.x, 0.05, npc.z);
      scene.add(nRing);
      proximityRingMeshes.push({ mesh: nRing, target: new THREE.Vector3(npc.x, 0, npc.z), phase: Math.random()*Math.PI*2 });
    }
    if (npc.quest && !island.restored) buildQuestIndicator(nMesh, npc);
  });

  // Shadow Creep
  const scGeo = new THREE.CircleGeometry(1.5, 20);
  const scMat = new THREE.MeshBasicMaterial({ color: PALETTE.deepPlumN, transparent: true, opacity: 0.22, depthWrite: false });
  shadowCreepMesh = new THREE.Mesh(scGeo, scMat);
  shadowCreepMesh.rotation.x = -Math.PI/2;
  shadowCreepMesh.position.set(5, 0.05, 5);
  shadowCreepMesh.userData = { radius: 0.5, growing: !island.restored };
  scene.add(shadowCreepMesh);

  buildGuardianStar();
  buildQuestItems(islandId);

  particles.addAmbientMotes(isMobile ? 60 : 120);
  if (islandId === 2) particles.addPetals(isMobile?20:40, PALETTE.softPinkN);
  if (islandId === 4) particles.addAmbientMotes(isMobile?30:60);
  if (islandId === 5) particles.addPetals(isMobile?20:40, PALETTE.softLavenderN);

  updateCrystalHUD();
  drawCompass(island);

  if (audioReady) setIslandAudio(islandId);
}

// ── Spawn a crystal mesh + glow light ────────────────────────
function spawnCrystal(cp, i, island) {
  const geo = new THREE.SphereGeometry(0.14, 10, 8);
  const mat = new THREE.MeshLambertMaterial({ color: PALETTE.softPinkN, emissive: PALETTE.softPurpleN, emissiveIntensity: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cp.x, 0.5, cp.z);
  mesh.userData = { crystalIdx: i, bobBase: 0.5 };
  scene.add(mesh); crystalMeshes.push(mesh);
  const orbit = particles.addCrystalOrbiters(cp.x, 0.5, cp.z);
  crystalOrbits.push({ mesh, orbit });
  const cl = new THREE.PointLight(PALETTE.softPinkN, 0.5, 2.5);
  cl.position.set(cp.x, 0.5, cp.z);
  scene.add(cl);
  // Store with crystal mesh reference so we can remove it on collect
  cl.userData = { forCrystal: mesh.uuid };
  crystalLights.push(cl);
  if (isMobile) {
    const ringGeo = new THREE.RingGeometry(0.36, 0.44, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.softPinkN, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI/2;
    ring.position.set(cp.x, 0.05, cp.z);
    scene.add(ring);
    proximityRingMeshes.push({ mesh: ring, target: new THREE.Vector3(cp.x, 0, cp.z), phase: Math.random()*Math.PI*2 });
  }
}

// ── Reveal hidden crystal after NPC quest ────────────────────
function revealHiddenCrystal(crystalIdx) {
  const island = getIsland(currentIslandId);
  const cp = island.crystalPositions[crystalIdx];
  if (!cp || !cp.hidden) return;
  if (island.crystalCount > crystalIdx) return; // already collected
  // Check not already spawned
  const alreadySpawned = crystalMeshes.some(m => m.userData.crystalIdx === crystalIdx);
  if (alreadySpawned) return;
  spawnCrystal(cp, crystalIdx, island);
  // Flash effect
  particles.addBurst(cp.x, 0.5, cp.z, PALETTE.goldenYellowN, 20);
  showFloatingText('✨ Crystal Revealed!', cp.x, cp.z, '#EBB21A');
}

// ── Dialogue System ───────────────────────────────────────────
function showDialogue(speaker, lines, callback) {
  if (state === 'dialogue') return;
  state = 'dialogue';
  dialogueQueue = [...lines];
  dialogueCallback = callback || null;
  dialogueSpeaker.textContent = speaker;
  dialogueBox.style.display = 'block';
  ePrompt.style.display = 'none';
  advanceDialogue();
}

function advanceDialogue() {
  if (dialogueQueue.length === 0) { closeDialogue(); return; }
  const line = dialogueQueue.shift();
  fullLine = line;
  currentLine = '';
  dialogueText.textContent = '';
  dialogueContinue.style.display = 'none';
  if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer=null; }
  let ci = 0;
  sfxDialogue();
  typewriterTimer = setInterval(() => {
    if (ci < line.length) {
      currentLine += line[ci++];
      dialogueText.textContent = currentLine;
      if (ci % 8 === 0) sfxDialogue();
    } else {
      clearInterval(typewriterTimer); typewriterTimer = null;
      dialogueContinue.style.display = 'block';
    }
  }, 28);
}

function closeDialogue() {
  dialogueBox.style.display = 'none';
  if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer=null; }
  state = 'playing';
  if (dialogueCallback) { const cb = dialogueCallback; dialogueCallback = null; cb(); }
}

// ── Crystal Collection ────────────────────────────────────────
function collectCrystal(mesh) {
  const island = getIsland(currentIslandId);
  island.crystalCount++;
  const now = performance.now();
  crystalComboTimestamps.push(now);
  crystalComboTimestamps = crystalComboTimestamps.filter(t => now - t < 5000);
  if (crystalComboTimestamps.length >= 3) {
    showFloatingText('✨ Crystal Surge!', mesh.position.x, mesh.position.z, '#EBB21A');
    crystalComboTimestamps = [];
  }
  // Remove glow light for this crystal
  for (let li = crystalLights.length - 1; li >= 0; li--) {
    if (crystalLights[li].userData.forCrystal === mesh.uuid) {
      scene.remove(crystalLights[li]);
      crystalLights.splice(li, 1);
      break;
    }
  }
  scene.remove(mesh);
  const ci = crystalMeshes.indexOf(mesh);
  if (ci >= 0) crystalMeshes.splice(ci, 1);
  const mpos = mesh.position;
  for (let ri = proximityRingMeshes.length-1; ri >= 0; ri--) {
    const r = proximityRingMeshes[ri];
    if (r.target.distanceTo(mpos) < 0.5) {
      scene.remove(r.mesh);
      proximityRingMeshes.splice(ri, 1);
      break;
    }
  }
  particles.addBurst(mesh.position.x, mesh.position.y, mesh.position.z, PALETTE.softPinkN, 25);
  particles.addPulseRing(mesh.position.x, 0.1, mesh.position.z);
  sfxCrystalCollect();
  updateCrystalHUD(true);
  if (island.crystalCount >= island.totalCrystals) {
    buildShrineBeam(island);
    setTimeout(()=>showDialogue('✨ Shrine', ['All crystal shards gathered! Bring them to the shrine at the center of the island!'], null), 600);
  }
  saveGame();
}

// ── Floating text ─────────────────────────────────────────────
function showFloatingText(text, wx, wz, color='#ffffff') {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `position:fixed;font-family:Nunito,sans-serif;font-size:16px;font-weight:800;
    color:${color};text-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:none;z-index:60;
    transition:transform 1.2s ease, opacity 1.2s ease;`;
  const v = new THREE.Vector3(wx, 1.2, wz).project(camera);
  const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
  el.style.left = (sx - 60) + 'px';
  el.style.top = sy + 'px';
  el.style.opacity = '1';
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = 'translateY(-40px)'; el.style.opacity = '0'; });
  setTimeout(() => el.remove(), 1300);
}

// ── Shrine Restoration ────────────────────────────────────────
function activateShrine() {
  const island = getIsland(currentIslandId);
  if (island.restored || island.crystalCount < island.totalCrystals) {
    if (island.crystalCount < island.totalCrystals) {
      showDialogue('Shrine', [`The shrine stirs… ${island.totalCrystals - island.crystalCount} crystal shard${island.totalCrystals-island.crystalCount!==1?'s':''} still missing.`], null);
    }
    return;
  }
  island.restored = true;
  sfxShrine();
  removeShrineBeam();
  particles.addRestorationBurst(island.shrinePos.x, 1, island.shrinePos.z);
  shakeTimer = 0.35; shakeIntensity = 0.18;
  if (shrineMesh) { shrineMesh.material.emissiveIntensity = 0.9; }
  if (shadowCreepMesh) shadowCreepMesh.userData.growing = false;
  buildGuardianStar();

  const abilityMap = ['pulse','sprint','heatWard','whistle','sonar'];
  const abilityNames = ['Lantern Pulse','Sprint','Heat Ward','Whistle','Sonar Echo'];
  const abilityKey = abilityMap[currentIslandId];
  if (abilityKey && player) { player.grantAbility(abilityKey); updateAbilityBar(); }

  const restoreLines = [
    `The island shrine awakens! Light floods the ${island.name}!`,
    island.npcs.length ? island.npcs[0].restoredLine : 'The island glows with restored light!',
    abilityKey ? `New ability unlocked: ${abilityNames[currentIslandId]}!` : 'The Guardian Star grows closer to awakening…'
  ];

  showDialogue('✨ Restoration!', restoreLines, () => {
    saveGame();
    if (currentIslandId + 1 < ISLANDS.length) {
      ISLANDS[currentIslandId+1].unlocked = true;
      showDialogue('✨ Map Updated', [`A new island has appeared on your map: ${ISLANDS[currentIslandId+1].name}!`, 'Press M or tap the Map button to navigate.'], null);
    } else { triggerWin(); }
  });
}

// ── Win Sequence ──────────────────────────────────────────────
function triggerWin() {
  state = 'win';
  sfxWin();
  particles.addRestorationBurst(0, 2, 0);
  setTimeout(() => particles.addRestorationBurst(0, 2, 0), 400);
  setTimeout(() => particles.addRestorationBurst(0, 2, 0), 800);
  document.getElementById('win-screen').style.display = 'flex';
  showHUD(false);
  localStorage.removeItem('lanternIsle_save');
}

function updateAbilityBar() {
  if (!player) return;
  document.getElementById('ab-pulse').style.display = player.abilities.pulse ? 'flex' : 'none';
  document.getElementById('ab-sprint').style.display = player.abilities.sprint ? 'flex' : 'none';
}

// ── Compass ───────────────────────────────────────────────────
function drawCompass(island) {
  const cc = document.getElementById('compass-canvas');
  const ctx = cc.getContext('2d');
  const w = cc.width, h = cc.height, cx = w/2, cy = h/2, r = w/2-4;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = PALETTE.warmCream; ctx.fill();
  ctx.strokeStyle = PALETTE.goldenYellow; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = PALETTE.oliveGreen;
  ctx.beginPath(); ctx.ellipse(cx,cy,r*0.55,r*0.45,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8AAABB';
  ctx.beginPath(); ctx.arc(cx+r*0.3,cy-r*0.15,r*0.18,0,Math.PI*2); ctx.fill();
  ctx.font = 'bold 10px Nunito,sans-serif'; ctx.fillStyle = PALETTE.deepPlum; ctx.textAlign='center';
  ctx.fillText('N',cx,cy-r+14); ctx.fillText('S',cx,cy+r-4);
  ctx.fillText('E',cx+r-4,cy+4); ctx.fillText('W',cx-r+4,cy+4);
  ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2);
  ctx.fillStyle = PALETTE.coralRed; ctx.fill();
}

// ── World Map Screen ──────────────────────────────────────────
function drawWorldMap() {
  const mc = document.getElementById('map-canvas');
  const ctx = mc.getContext('2d');
  const W = mc.width, H = mc.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = PALETTE.warmCream; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#D4836A'; ctx.lineWidth = 6; ctx.strokeRect(8,8,W-16,H-16);
  ctx.strokeStyle = '#EB6259'; ctx.lineWidth = 2; ctx.strokeRect(14,14,W-28,H-28);
  ctx.font = 'bold 28px Nunito,sans-serif'; ctx.fillStyle = PALETTE.deepPlum;
  ctx.textAlign = 'center'; ctx.fillText('✨ World Map ✨', W/2, 44);

  const islandPositions = ISLANDS.map(i=>({x:i.mapPos.x*W, y:i.mapPos.y*H}));
  const connections = [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,5]];
  ctx.setLineDash([4,8]); ctx.strokeStyle = PALETTE.deepPlum; ctx.lineWidth=1.5; ctx.globalAlpha=0.5;
  connections.forEach(([a,b])=>{
    ctx.beginPath(); ctx.moveTo(islandPositions[a].x, islandPositions[a].y);
    ctx.lineTo(islandPositions[b].x, islandPositions[b].y); ctx.stroke();
  });
  ctx.setLineDash([]); ctx.globalAlpha=1;

  ISLANDS.forEach((island, i) => {
    const px = island.mapPos.x * W, py = island.mapPos.y * H;
    ctx.save();
    if (!island.unlocked) ctx.globalAlpha = 0.38;
    ctx.beginPath(); ctx.ellipse(px,py,46,34,0,0,Math.PI*2);
    ctx.fillStyle = island.restored ? new THREE.Color(island.groundColor).getStyle() : '#9B9AE2';
    ctx.fill();
    ctx.strokeStyle = island.restored ? PALETTE.goldenYellow : PALETTE.softLavender; ctx.lineWidth = 2; ctx.stroke();
    if (island.restored) {
      ctx.shadowColor = PALETTE.goldenYellow; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(px,py,46,34,0,0,Math.PI*2);
      ctx.strokeStyle = PALETTE.goldenYellow; ctx.lineWidth=2; ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (!island.unlocked) { ctx.font='18px sans-serif'; ctx.fillStyle=PALETTE.deepPlum; ctx.textAlign='center'; ctx.fillText('🔒',px,py+6); }
    ctx.restore();
    ctx.font = 'bold 11px Nunito,sans-serif'; ctx.fillStyle = PALETTE.deepPlum;
    ctx.textAlign='center'; ctx.globalAlpha = island.unlocked?1:0.4;
    ctx.fillText(island.name, px, py+50); ctx.globalAlpha=1;
  });
}

// ── Tile-based bounds check ───────────────────────────────────
function isOnGround(x, z) {
  const tx = Math.round(x), tz = Math.round(z);
  return islandBoundarySet.has(`${tx},${tz}`);
}

// ── Input ─────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  const wasDown = keys[k];
  keys[k] = true;
  if (state === 'title') return;
  if (state === 'dialogue') {
    if (!wasDown && (k === ' ' || k === 'enter' || k === 'e')) {
      e.preventDefault();
      if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer=null; currentLine=fullLine; dialogueText.textContent=fullLine; dialogueContinue.style.display='block'; return; }
      advanceDialogue();
    }
    return;
  }
  if (state === 'playing') {
    if (!wasDown && (k === 'm' || k === 'tab')) { e.preventDefault(); openMap(); return; }
    if (!wasDown && (k === ' ' || k === 'e')) { e.preventDefault(); handleInteract(); }
    if (!wasDown && k === 'shift') { if(player) player.activateSprint(); }
  }
  if (state === 'map') {
    if (!wasDown && (k === 'm' || k === 'tab' || k === 'escape')) { e.preventDefault(); closeMap(); }
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function handleInteract() {
  if (!player || !audioReady) return;
  const island = getIsland(currentIslandId);
  const pp = player.pos;

  // Shrine: require Space press, tighter radius (0.9)
  const sd = Math.sqrt((pp.x-island.shrinePos.x)**2+(pp.z-island.shrinePos.z)**2);
  if (sd < 0.9) { activateShrine(); return; }

  for (let ni = 0; ni < npcMeshes.length; ni++) {
    const nm = npcMeshes[ni];
    const d = pp.distanceTo(nm.position);
    if (d < 1.4) {
      const lookTarget = new THREE.Vector3(pp.x, nm.position.y, pp.z);
      nm.lookAt(lookTarget);
      const npc = island.npcs[ni];
      handleNPCInteract(npc, ni); return;
    }
  }

  for (let i = crystalMeshes.length-1; i >= 0; i--) {
    const cm = crystalMeshes[i];
    const d = pp.distanceTo(cm.position);
    if (d < 1.0) { collectCrystal(cm); return; }
  }

  if (player.abilities.pulse) {
    if (player.activatePulse()) {
      sfxLanternPulse();
      particles.addBurst(pp.x, 0.5, pp.z, PALETTE.goldenYellowN, 20);
      particles.addPulseRing(pp.x, 0, pp.z);
      pulseRevealTimer = 3;
    }
  }
}

function handleNPCInteract(npc, ni) {
  const island = getIsland(currentIslandId);
  if (island.restored) { showDialogue(npc.name, [npc.restoredLine], null); return; }

  if (npc.quest) {
    const qt = npc.quest.type;

    // reveal_crystal: NPC quest that spawns a hidden crystal
    if (qt === 'reveal_crystal' && !npc.quest.done) {
      showDialogue(npc.name, npc.lines, () => {
        npc.quest.done = true;
        revealHiddenCrystal(npc.quest.crystalIdx);
      });
      return;
    }
    if (qt === 'reveal_crystal' && npc.quest.done) {
      // Already revealed — check if still on ground
      const cp = island.crystalPositions[npc.quest.crystalIdx];
      const collected = island.crystalCount > npc.quest.crystalIdx;
      showDialogue(npc.name, [collected ? npc.restoredLine : `The shard is near — go get it!`], null);
      return;
    }

    if (qt === 'find_cat' && !questState.find_cat) {
      // Must find Mochi first (walk near the cat mesh)
      const mochiMesh = questItemMeshes.find(m => m.userData.type === 'mochi_cat');
      const mochiFound = !mochiMesh || questState.mochi_found;
      if (!mochiFound) {
        showDialogue(npc.name, ["Oh! Mochi ran off again! She has orange fur and loves sparkly things.", "I think she went toward the mossy corner… could you find her?"], null);
        return;
      }
      showDialogue(npc.name, ["*gasp* There's Mochi! Thank you! Here, take this crystal shard!"], ()=>{
        questState.find_cat = true;
        island.crystalCount++; updateCrystalHUD(); sfxCrystalCollect();
      });
      return;
    }
    if (qt === 'fetch_water' && !questState.fetch_water) {
      const jarMesh = questItemMeshes.find(m => m.userData.type === 'water_jar');
      const jarHeld = !jarMesh || questState.jar_held;
      if (!jarHeld) {
        showDialogue(npc.name, ["My garden is wilting… could you bring water from the well?", "The water jar should be just to the east — bring it to me!"], null);
        return;
      }
      showDialogue(npc.name, ["Oh, you brought me water! You're too kind! Take this shard I found!"], ()=>{
        questState.fetch_water = true;
        island.crystalCount++; updateCrystalHUD(); sfxCrystalCollect();
      });
      return;
    }
    if (qt === 'elder_final' && questState.find_cat && questState.fetch_water && !npc.quest.done) {
      showDialogue(npc.name, npc.lines, ()=>{
        npc.quest.done = true;
        island.crystalCount++; updateCrystalHUD(); sfxCrystalCollect();
        showDialogue(npc.name, ["The village shards are together. Now bring them to the shrine, young one."], null);
      });
      return;
    }
  }
  showDialogue(npc.name, npc.lines, null);
}

// ── Map ───────────────────────────────────────────────────────
function openMap() { sfxClick(); state='map'; drawWorldMap(); document.getElementById('map-screen').style.display='flex'; }
function closeMap() { sfxClick(); document.getElementById('map-screen').style.display='none'; state='playing'; }

function selectIslandFromMap(islandId) {
  if (!ISLANDS[islandId].unlocked) return;
  closeMap();
  fadeOut(() => { loadIsland(islandId); fadeIn(); });
}

function loadIsland(id) {
  currentIslandId = id;
  questState = { find_cat: false, fetch_water: false, mochi_found: false, jar_held: false };
  player.pos.set(0, 0, 2);
  buildIsland(id);
  updateAbilityBar();
  const island = getIsland(id);
  setTimeout(()=>showDialogue(`✨ ${island.name}`, [`You arrive at ${island.name}.`, `Explore and find the crystal shards! Talk to the locals — some know where hidden shards are!`], null), 500);
}

// ── Mobile Controls ───────────────────────────────────────────
function setupMobile() {
  if (!isMobile) return;
  document.getElementById('mobile-controls').style.display = 'block';
  const zone = document.getElementById('joystick-zone');
  const knob = document.getElementById('joystick-knob');
  const actionBtn = document.getElementById('action-btn');
  let origin = null;
  zone.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.touches[0]; origin={x:t.clientX,y:t.clientY}; },{passive:false});
  zone.addEventListener('touchmove', e=>{
    e.preventDefault(); if(!origin) return;
    const t=e.touches[0]; const dx=t.clientX-origin.x, dy=t.clientY-origin.y;
    const dist=Math.min(Math.sqrt(dx*dx+dy*dy),40); const angle=Math.atan2(dy,dx);
    knob.style.transform=`translate(calc(-50% + ${Math.cos(angle)*dist}px),calc(-50% + ${Math.sin(angle)*dist}px))`;
    joystickDir.x=dx/40; joystickDir.z=dy/40;
  },{passive:false});
  zone.addEventListener('touchend', ()=>{ origin=null; joystickDir.x=0; joystickDir.z=0; knob.style.transform='translate(-50%,-50%)'; });
  actionBtn.addEventListener('touchstart', e=>{ e.preventDefault(); handleInteract(); },{passive:false});
}

// ── Map click ─────────────────────────────────────────────────
document.getElementById('map-canvas').addEventListener('click', e => {
  if (state !== 'map') return;
  const rect = e.target.getBoundingClientRect();
  const mx=(e.clientX-rect.left)/rect.width, my=(e.clientY-rect.top)/rect.height;
  ISLANDS.forEach((island,i)=>{ const dx=mx-island.mapPos.x,dy=my-island.mapPos.y; if(Math.sqrt(dx*dx+dy*dy)<0.08&&island.unlocked) selectIslandFromMap(i); });
});

document.getElementById('close-map').addEventListener('click', ()=>{ sfxClick(); closeMap(); });
document.getElementById('map-btn').addEventListener('click', ()=>{ if(state==='playing') openMap(); });
document.getElementById('sound-toggle').addEventListener('click', ()=>{
  const m=toggleMute(); document.getElementById('sound-toggle').textContent=m?'🔇':'🔊';
});
document.getElementById('dialogue-box').addEventListener('click', e=>{
  e.stopPropagation();
  if(typewriterTimer){clearInterval(typewriterTimer);typewriterTimer=null;currentLine=fullLine;dialogueText.textContent=fullLine;dialogueContinue.style.display='block';return;}
  advanceDialogue();
});
document.getElementById('restart-btn').addEventListener('click', ()=>{
  document.getElementById('win-screen').style.display='none';
  ISLANDS.forEach(i=>{ i.unlocked=false; i.restored=false; i.crystalCount=0; });
  ISLANDS[0].unlocked=true;
  loadIsland(0); showHUD(true); state='playing';
});

// ── Start ─────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', ()=>{
  initAudio(); audioReady=true;
  startExploreMusic(); setIslandAudio(0);
  document.getElementById('title-screen').style.display='none';
  showHUD(true);
  const savedIsland = loadGame();
  state='playing';
  buildIsland(savedIsland||0);
  if(savedIsland!==false&&savedIsland>0){
    setTimeout(()=>showDialogue('✨ Welcome Back',['Your journey continues… talk to the locals to find hidden crystal shards!'],null),800);
  } else {
    setTimeout(()=>showDialogue('✨ Lantern Bearer',[
      'Find 5 crystal shards, bring them to the shrine!',
      'Press Space or tap NPCs to talk — some know where hidden shards are!'
    ],null),800);
  }
});

// ── Resize ────────────────────────────────────────────────────
window.addEventListener('resize', ()=>{
  const w=window.innerWidth, h=window.innerHeight, a=w/h;
  renderer.setSize(w,h); camera.left=-camD*a; camera.right=camD*a;
  camera.top=camD; camera.bottom=-camD; camera.updateProjectionMatrix();
  canvas.width=w; canvas.height=h;
});

// ── Main Loop ─────────────────────────────────────────────────
let last = 0, time = 0;
particles = new ParticleSystem(scene);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
player = new Player(scene);

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts; time += dt;
  if (state === 'title') { renderer.render(scene, camera); return; }

  if (state === 'playing') {
    const prevX = player.pos.x, prevZ = player.pos.z;
    const footstepDust = player.update(dt, keys, (joystickDir.x||joystickDir.z) ? joystickDir : null);
    if (footstepDust) particles.addFootstepDust(player.pos.x, player.pos.z);

    // Tile-based bounds: revert if moved off ground
    if (!isOnGround(player.pos.x, player.pos.z)) {
      player.pos.x = prevX;
      player.pos.z = prevZ;
    }
    // Hard safety clamp as fallback
    const SAFE = 8.5;
    player.pos.x = Math.max(-SAFE, Math.min(SAFE, player.pos.x));
    player.pos.z = Math.max(-SAFE, Math.min(SAFE, player.pos.z));
    player.group.position.x = player.pos.x;
    player.group.position.z = player.pos.z;

    // Camera follow
    const tx = player.pos.x+12, tz = player.pos.z+12;
    camera.position.x += (tx - camera.position.x) * 5 * dt;
    camera.position.z += (tz - camera.position.z) * 5 * dt;
    camera.position.y = 12;
    camera.lookAt(player.pos.x, 0, player.pos.z);

    // Screen shake
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      const decay = shakeTimer / 0.35;
      camera.position.x += (Math.random()-0.5)*2 * shakeIntensity * decay;
      camera.position.z += (Math.random()-0.5)*2 * shakeIntensity * decay;
    }

    // Foliage bob
    islandMeshes.forEach(m=>{
      if(m.userData.bobBase!==undefined) m.position.y=m.userData.bobBase+Math.sin(time*1.5+(m.userData.bobOffset||0))*0.03;
    });
    // NPC bob + interaction ring highlight
    npcMeshes.forEach(m=>{
      m.position.y = m.userData.bobBase + Math.sin(time*1.8+m.userData.bobOffset)*0.04;
      // Find the interact ring child and pulse it when player is near
      const dist = player.pos.distanceTo(m.position);
      m.children.forEach(c => {
        if (c.userData.isInteractRing) {
          c.material.opacity = dist < 1.5 ? (0.5 + Math.sin(time*4)*0.3) : 0;
        }
      });
    });
    // Quest indicators bob + refresh symbol
    questIndicators.forEach(q => {
      const hasDone = q.npc.quest && q.npc.quest.done;
      q.mesh.position.y = q.mesh.userData.bobBase + Math.sin(time*2.0)*0.06;
      // Rebuild texture if quest state changed
      if (q.mesh.userData.wasQuested !== hasDone) {
        q.mesh.userData.wasQuested = hasDone;
        const c2 = document.createElement('canvas'); c2.width=64; c2.height=64;
        const cx = c2.getContext('2d');
        cx.clearRect(0,0,64,64);
        cx.font='bold 42px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle';
        cx.fillStyle = hasDone ? '#7BDD90' : '#FFD84A';
        cx.fillText(hasDone ? '✓' : '?', 32, 32);
        q.mesh.material.map = new THREE.CanvasTexture(c2);
        q.mesh.material.needsUpdate = true;
      }
      // Hide when island restored
      const isl = getIsland(currentIslandId);
      q.mesh.visible = !isl.restored;
    });
    // Quest items bob + ring pulse
    questItemMeshes.forEach(m => {
      m.position.y = m.userData.bobBase + Math.sin(time*1.6 + m.userData.bobOffset)*0.05;
      m.children.forEach(c => {
        if (c.userData.isPulseRing) {
          c.material.opacity = 0.4 + Math.sin(time*3)*0.25;
        }
      });
    });
    // Crystal bob
    crystalMeshes.forEach(m=>{
      m.position.y=m.userData.bobBase+Math.sin(time*2.2)*0.06;
      m.material.emissiveIntensity=0.5+Math.sin(time*2)*0.2;
      m.rotation.y+=dt*0.8;
    });
    // Shrine pulse
    if(shrineMesh){ shrineMesh.rotation.y+=dt*0.4; shrineMesh.position.y=0.3+Math.sin(time*1.4)*0.03; }
    // Shrine beam
    if(shrinBeamMesh){ shrinBeamMesh.material.opacity=0.18+Math.sin(time*2.2)*0.08; shrinBeamMesh.rotation.y+=dt*0.3; }
    // Guardian Star
    if(guardianStarMesh){
      guardianStarAngle+=dt*0.12;
      guardianStarMesh.position.x=Math.sin(guardianStarAngle)*4;
      guardianStarMesh.position.z=Math.cos(guardianStarAngle)*4;
      guardianStarMesh.rotation.y+=dt*0.4; guardianStarMesh.rotation.x+=dt*0.2;
      const pulse=0.5+Math.sin(time*1.8)*0.3;
      guardianStarMesh.material.emissiveIntensity=guardianStarMesh.material.emissiveIntensity*0.9+pulse*0.1;
      if(guardianStarGlowMesh){guardianStarGlowMesh.position.copy(guardianStarMesh.position);guardianStarGlowMesh.rotation.copy(guardianStarMesh.rotation);guardianStarGlowMesh.material.opacity=0.12+Math.sin(time*1.4)*0.06;}
      if(guardianStarLight) guardianStarLight.position.copy(guardianStarMesh.position);
    }
    // Shadow creep
    if(shadowCreepMesh&&shadowCreepMesh.userData.growing){
      shadowCreepMesh.userData.radius=Math.min(shadowCreepMesh.userData.radius+dt*0.04,4);
      shadowCreepMesh.scale.setScalar(shadowCreepMesh.userData.radius/1.5);
      const scPos=shadowCreepMesh.position;
      const distToCreep=Math.sqrt(Math.pow(player.pos.x-scPos.x,2)+Math.pow(player.pos.z-scPos.z,2));
      const inCreep=distToCreep<shadowCreepMesh.userData.radius*1.0;
      player.speed=inCreep?2.2:4.5;
      const grain=document.getElementById('grain');
      if(grain) grain.style.opacity=inCreep?'0.22':'0.09';
    }
    if(pulseRevealTimer>0) pulseRevealTimer-=dt;
    // Mobile proximity rings
    if(isMobile){
      const pp=player.pos;
      proximityRingMeshes.forEach(r=>{
        const dist=pp.distanceTo(r.target);
        r.mesh.scale.setScalar(1+Math.sin(time*3+r.phase)*0.12);
        r.mesh.material.opacity=0.2+Math.max(0,1-dist/3)*0.5;
      });
    }
  }

  // Auto-collect crystals on proximity
  if (state === 'playing' && player) {
    for(let i=crystalMeshes.length-1;i>=0;i--){
      if(player.pos.distanceTo(crystalMeshes[i].position)<1.1){ collectCrystal(crystalMeshes[i]); break; }
    }
    // Quest item proximity: Mochi cat + water jar
    for(let qi=questItemMeshes.length-1;qi>=0;qi--){
      const qm = questItemMeshes[qi];
      if(player.pos.distanceTo(qm.position)<1.0){
        if(qm.userData.type==='mochi_cat' && !questState.mochi_found){
          questState.mochi_found=true;
          particles.addBurst(qm.position.x,0.3,qm.position.z,0xF4883A,16);
          showFloatingText('🐱 Found Mochi!',qm.position.x,qm.position.z,'#F4883A');
          scene.remove(qm); questItemMeshes.splice(qi,1);
          sfxCrystalCollect();
        } else if(qm.userData.type==='water_jar' && !questState.jar_held){
          questState.jar_held=true;
          particles.addBurst(qm.position.x,0.3,qm.position.z,0x7EC0D4,14);
          showFloatingText('💧 Water Jar picked up!',qm.position.x,qm.position.z,'#7EC0D4');
          scene.remove(qm); questItemMeshes.splice(qi,1);
          sfxCrystalCollect();
        }
        break;
      }
    }
    // Auto-trigger shrine on proximity (tighter: 0.85) + Space still needed for intentional confirm
    if(shrineMesh){
      const island=getIsland(currentIslandId);
      const sd=Math.sqrt((player.pos.x-island.shrinePos.x)**2+(player.pos.z-island.shrinePos.z)**2);
      if(sd<0.85&&!island.restored&&island.crystalCount>=island.totalCrystals){ activateShrine(); }
    }
  }

  updateEPrompt();
  particles.update(dt);
  renderer.render(scene, camera);
}

setupMobile();
requestAnimationFrame(loop);
