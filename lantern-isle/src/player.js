// ============================================================
// PLAYER — Chibi character, abilities, movement
// ============================================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PALETTE } from './world.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.speed = 4.5;
    this.facing = 0; // radians
    this.group = new THREE.Group();
    this.bobTime = 0;
    this.footstepTimer = 0;
    this.isMoving = false;
    this.hairLag = [];
    // Abilities
    this.abilities = { pulse: false, sprint: false, heatWard: false, whistle: false, sonar: false };
    this.sprintCooldown = 0; this.sprintActive = false; this.sprintTimer = 0;
    this.pulseCooldown = 0;
    this.pulseActive = false; this.pulseRadius = 0;
    this._build();
    scene.add(this.group);
  }

  _build() {
    const g = this.group;
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.28, 0.32, 0.2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: PALETTE.warmCreamN });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.16;
    g.add(this.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xF5E6D0 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 0.54;
    g.add(this.head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeMat = new THREE.MeshLambertMaterial({ color: PALETTE.deepPlumN });
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.085, 0.565, 0.19);
    this.eyeR.position.set(0.085, 0.565, 0.19);
    g.add(this.eyeL); g.add(this.eyeR);
    // Eye shine
    const shineGeo = new THREE.SphereGeometry(0.015, 4, 4);
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shL = new THREE.Mesh(shineGeo, shineMat);
    const shR = new THREE.Mesh(shineGeo, shineMat);
    shL.position.set(-0.075, 0.575, 0.22);
    shR.position.set(0.095, 0.575, 0.22);
    g.add(shL); g.add(shR);

    // Hair — flowing brown, several strands
    this.hairGroup = new THREE.Group();
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x7B4F2E });
    // Main hair cap
    const capGeo = new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI*2, 0, Math.PI*0.55);
    this.hairCap = new THREE.Mesh(capGeo, hairMat);
    this.hairCap.position.y = 0.56;
    this.hairGroup.add(this.hairCap);
    // Side strands (flat planes)
    for (let s = 0; s < 3; s++) {
      const strandGeo = new THREE.PlaneGeometry(0.08, 0.28 + s*0.06);
      const strand = new THREE.Mesh(strandGeo, hairMat);
      const side = s === 0 ? -1 : s === 1 ? 1 : 0;
      strand.position.set(side * 0.2, 0.38 - s*0.02, s===2?-0.18:0.05);
      strand.rotation.z = side * 0.15;
      this.hairGroup.add(strand);
    }
    // Back hair (trailing)
    const backGeo = new THREE.PlaneGeometry(0.3, 0.38);
    this.hairBack = new THREE.Mesh(backGeo, hairMat);
    this.hairBack.position.set(0, 0.42, -0.2);
    this.hairBack.rotation.x = 0.3;
    this.hairGroup.add(this.hairBack);
    g.add(this.hairGroup);

    // Scarf
    const scarfGeo = new THREE.TorusGeometry(0.12, 0.035, 6, 12);
    const scarfMat = new THREE.MeshLambertMaterial({ color: PALETTE.coralRedN });
    this.scarf = new THREE.Mesh(scarfGeo, scarfMat);
    this.scarf.position.y = 0.38;
    this.scarf.rotation.x = Math.PI/2;
    g.add(this.scarf);
    // Scarf tail
    const tailGeo = new THREE.BoxGeometry(0.04, 0.14, 0.04);
    this.scarfTail = new THREE.Mesh(tailGeo, scarfMat);
    this.scarfTail.position.set(0.1, 0.3, 0.05);
    g.add(this.scarfTail);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.1, 0.08, 0.12);
    const bootMat = new THREE.MeshLambertMaterial({ color: PALETTE.oliveGreenN });
    this.bootL = new THREE.Mesh(bootGeo, bootMat);
    this.bootR = new THREE.Mesh(bootGeo, bootMat);
    this.bootL.position.set(-0.08, 0.04, 0); this.bootR.position.set(0.08, 0.04, 0);
    g.add(this.bootL); g.add(this.bootR);

    // Lantern
    const lanternGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const lanternMat = new THREE.MeshLambertMaterial({ color: PALETTE.goldenYellowN, emissive: 0xEBB21A, emissiveIntensity: 0.6 });
    this.lantern = new THREE.Mesh(lanternGeo, lanternMat);
    this.lantern.position.set(0.22, 0.38, 0.08);
    g.add(this.lantern);
    // Lantern handle
    const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x8B5E2A });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.22, 0.46, 0.08);
    g.add(handle);
    // Lantern light
    this.lanternLight = new THREE.PointLight(PALETTE.goldenYellowN, 0.8, 5);
    this.lanternLight.position.set(0.22, 0.38, 0.08);
    g.add(this.lanternLight);

    // Shadow (plum disc)
    const shadowGeo = new THREE.CircleGeometry(0.22, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: PALETTE.deepPlumN, transparent: true, opacity: 0.28, depthWrite: false });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI/2;
    this.shadow.position.y = 0.01;
    g.add(this.shadow);
  }

  update(dt, keys, isoDir) {
    this.bobTime += dt;
    // Movement
    let dx = 0, dz = 0;
    if (keys['w']||keys['arrowup']) dz -= 1;
    if (keys['s']||keys['arrowdown']) dz += 1;
    if (keys['a']||keys['arrowleft']) dx -= 1;
    if (keys['d']||keys['arrowright']) dx += 1;
    // Mobile joystick input
    if (isoDir) { dx = isoDir.x; dz = isoDir.z; }
    this.isMoving = dx !== 0 || dz !== 0;

    let spd = this.speed;
    if (this.sprintActive) spd *= 1.7;

    if (this.isMoving) {
      const len = Math.sqrt(dx*dx+dz*dz);
      this.pos.x += (dx/len) * spd * dt;
      this.pos.z += (dz/len) * spd * dt;
      this.facing = Math.atan2(dx, dz);
      // Footstep timer
      this.footstepTimer -= dt;
    }

    // Sprint
    if (this.sprintActive) {
      this.sprintTimer -= dt;
      if (this.sprintTimer <= 0) { this.sprintActive = false; this.sprintCooldown = 4; }
    }
    if (this.sprintCooldown > 0) this.sprintCooldown -= dt;

    // Pulse cooldown
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;

    // Pulse animation
    if (this.pulseActive) {
      this.pulseRadius += dt * 6;
      if (this.pulseRadius > 5) { this.pulseActive = false; this.pulseRadius = 0; }
    }

    // Animate group
    const bob = Math.sin(this.bobTime * 2.0) * 0.05;
    const hairSway = Math.sin(this.bobTime * 1.2) * 0.04;
    this.group.position.copy(this.pos);
    this.group.position.y = bob;
    this.group.rotation.y = this.facing;
    this.hairGroup.rotation.z = hairSway;
    // Hair trails when moving
    if (this.isMoving) this.hairBack.rotation.x = 0.5;
    else this.hairBack.rotation.x = 0.3;
    // Scarf trail
    this.scarfTail.rotation.z = this.isMoving ? 0.3 : 0.0;
    // Boot walk animation
    const walkBob = this.isMoving ? Math.sin(this.bobTime * 6) * 0.04 : 0;
    this.bootL.position.y = 0.04 + walkBob;
    this.bootR.position.y = 0.04 - walkBob;
    // Lantern glow oscillation
    this.lanternLight.intensity = 0.8 + Math.sin(this.bobTime * 1.2) * 0.15;
    // Lantern swing
    this.lantern.position.y = 0.38 + Math.sin(this.bobTime*3)*0.02;
  }

  activatePulse() {
    if (!this.abilities.pulse || this.pulseCooldown > 0) return false;
    this.pulseActive = true; this.pulseRadius = 0; this.pulseCooldown = 5;
    return true;
  }
  activateSprint() {
    if (!this.abilities.sprint || this.sprintCooldown > 0 || this.sprintActive) return false;
    this.sprintActive = true; this.sprintTimer = 3;
    return true;
  }
  grantAbility(name) { this.abilities[name] = true; }
}
