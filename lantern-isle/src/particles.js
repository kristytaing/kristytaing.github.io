// ============================================================
// PARTICLE SYSTEMS
// ============================================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PALETTE } from './world.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.systems = [];
  }

  _makePoints(count, color, size = 0.06) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    return { pts, geo, mat, pos, count };
  }

  addAmbientMotes(count = 120) {
    const { pts, pos, count: c } = this._makePoints(count, PALETTE.softPurpleN, 0.07);
    const velocities = [], phases = [];
    for (let i = 0; i < c; i++) {
      pos[i*3]   = (Math.random()-0.5)*20;
      pos[i*3+1] = Math.random()*4+0.5;
      pos[i*3+2] = (Math.random()-0.5)*20;
      velocities.push((Math.random()-0.5)*0.3, Math.random()*0.2+0.05, (Math.random()-0.5)*0.3);
      phases.push(Math.random()*Math.PI*2);
    }
    pts.geometry.attributes.position.needsUpdate = true;
    this.systems.push({ pts, pos, count: c, type:'ambient', velocities, phases, time:0 });
    return pts;
  }

  addCrystalOrbiters(cx, cy, cz, count = 5) {
    const { pts, pos, count: c } = this._makePoints(count, PALETTE.softPinkN, 0.08);
    const angles = Array.from({length:c},(_,i)=>i*(Math.PI*2/c));
    this.systems.push({ pts, pos, count:c, type:'orbit', cx,cy,cz, angles, radius:0.3 });
    return pts;
  }

  addBurst(x, y, z, color = PALETTE.softPinkN, count = 30) {
    const { pts, pos, count: c } = this._makePoints(count, color, 0.08);
    const vels = [];
    for (let i = 0; i < c; i++) {
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      const angle = Math.random()*Math.PI*2, speed = Math.random()*2+0.5;
      vels.push(Math.cos(angle)*speed, Math.random()*2+0.5, Math.sin(angle)*speed);
    }
    pts.geometry.attributes.position.needsUpdate = true;
    this.systems.push({ pts, pos, count:c, type:'burst', vels, life:1.2, t:0 });
    return pts;
  }

  addPulseRing(x, y, z) {
    const geo = new THREE.RingGeometry(0.1, 0.18, 32);
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.goldenYellowN, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, y+0.1, z); ring.rotation.x = -Math.PI/2;
    this.scene.add(ring);
    this.systems.push({ type:'ring', ring, mat, life:0.8, t:0 });
    return ring;
  }

  addPetals(count = 40, color = PALETTE.softPinkN) {
    const { pts, pos, count: c } = this._makePoints(count, color, 0.06);
    const vels = [], phases = [];
    for (let i = 0; i < c; i++) {
      pos[i*3]=(Math.random()-0.5)*18; pos[i*3+1]=Math.random()*5+1; pos[i*3+2]=(Math.random()-0.5)*18;
      vels.push((Math.random()-0.5)*0.4, -Math.random()*0.3-0.1, (Math.random()-0.5)*0.4);
      phases.push(Math.random()*Math.PI*2);
    }
    pts.geometry.attributes.position.needsUpdate = true;
    this.systems.push({ pts, pos, count:c, type:'petals', vels, phases, time:0 });
    return pts;
  }

  addFireflies(count = 35) {
    const { pts, pos, count: c } = this._makePoints(count, PALETTE.goldenYellowN, 0.1);
    const targets = [], speeds = [], phases = [];
    for (let i = 0; i < c; i++) {
      pos[i*3]=(Math.random()-0.5)*16; pos[i*3+1]=Math.random()*2+0.5; pos[i*3+2]=(Math.random()-0.5)*16;
      targets.push((Math.random()-0.5)*16, Math.random()*2+0.5, (Math.random()-0.5)*16);
      speeds.push(0.3+Math.random()*0.5);
      phases.push(Math.random()*Math.PI*2);
    }
    pts.geometry.attributes.position.needsUpdate = true;
    this.systems.push({ pts, pos, count:c, type:'firefly', targets, speeds, phases, time:0 });
    return pts;
  }

  addRestorationBurst(x, y, z) {
    for (let w = 0; w < 3; w++) {
      setTimeout(() => this.addBurst(x, y+0.5, z, [PALETTE.goldenYellowN, PALETTE.softPurpleN, PALETTE.softPinkN][w], 40), w*200);
    }
  }

  // Footstep dust — tiny ground puff when player steps
  addFootstepDust(x, z) {
    const count = 4;
    const { pts, pos, count: c } = this._makePoints(count, 0xD4C8A8, 0.05);
    const vels = [];
    for (let i = 0; i < c; i++) {
      pos[i*3] = x + (Math.random()-0.5)*0.18;
      pos[i*3+1] = 0.06;
      pos[i*3+2] = z + (Math.random()-0.5)*0.18;
      const angle = Math.random()*Math.PI*2;
      const spd = Math.random()*0.4+0.1;
      vels.push(Math.cos(angle)*spd, Math.random()*0.3+0.05, Math.sin(angle)*spd);
    }
    pts.geometry.attributes.position.needsUpdate = true;
    this.systems.push({ pts, pos, count:c, type:'dust', vels, life:0.5, t:0 });
    return pts;
  }

  update(dt) {
    const toRemove = [];
    for (let s of this.systems) {
      if (s.type === 'ambient') {
        s.time += dt;
        for (let i = 0; i < s.count; i++) {
          s.pos[i*3]   += s.velocities[i*3]   * dt;
          s.pos[i*3+1] += Math.sin(s.time*0.5+s.phases[i])*0.01;
          s.pos[i*3+2] += s.velocities[i*3+2] * dt;
          if (s.pos[i*3+1] > 5) s.pos[i*3+1] = 0.5;
          if (Math.abs(s.pos[i*3]) > 10) s.pos[i*3] *= -0.95;
          if (Math.abs(s.pos[i*3+2]) > 10) s.pos[i*3+2] *= -0.95;
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
      } else if (s.type === 'orbit') {
        s.time = (s.time||0) + dt;
        for (let i = 0; i < s.count; i++) {
          s.angles[i] += dt * 1.5;
          s.pos[i*3]   = s.cx + Math.cos(s.angles[i]) * s.radius;
          s.pos[i*3+1] = s.cy + 0.3 + Math.sin(s.time*2+i)*0.05;
          s.pos[i*3+2] = s.cz + Math.sin(s.angles[i]) * s.radius;
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
      } else if (s.type === 'burst') {
        s.t += dt;
        const life = 1 - s.t/s.life;
        s.pts.material.opacity = Math.max(0, life * 0.9);
        for (let i = 0; i < s.count; i++) {
          s.pos[i*3]   += s.vels[i*3]   * dt;
          s.pos[i*3+1] += s.vels[i*3+1] * dt - 2*dt; // gravity
          s.pos[i*3+2] += s.vels[i*3+2] * dt;
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
        if (s.t >= s.life) toRemove.push(s);
      } else if (s.type === 'dust') {
        s.t += dt;
        const life = 1 - s.t/s.life;
        s.pts.material.opacity = Math.max(0, life * 0.55);
        for (let i = 0; i < s.count; i++) {
          s.pos[i*3]   += s.vels[i*3]   * dt * (1 - s.t/s.life);
          s.pos[i*3+1] += s.vels[i*3+1] * dt * 0.3;
          s.pos[i*3+2] += s.vels[i*3+2] * dt * (1 - s.t/s.life);
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
        if (s.t >= s.life) toRemove.push(s);
      } else if (s.type === 'ring') {
        s.t += dt;
        const r = s.t / s.life;
        s.ring.scale.setScalar(1 + r * 8);
        s.mat.opacity = Math.max(0, (1-r)*0.8);
        if (s.t >= s.life) toRemove.push(s);
      } else if (s.type === 'petals') {
        s.time += dt;
        for (let i = 0; i < s.count; i++) {
          s.pos[i*3]   += s.vels[i*3]   * dt + Math.sin(s.time*0.8+s.phases[i])*0.01;
          s.pos[i*3+1] += s.vels[i*3+1] * dt;
          s.pos[i*3+2] += s.vels[i*3+2] * dt;
          if (s.pos[i*3+1] < 0) { s.pos[i*3+1]=5; s.pos[i*3]=(Math.random()-0.5)*18; s.pos[i*3+2]=(Math.random()-0.5)*18; }
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
      } else if (s.type === 'firefly') {
        s.time += dt;
        for (let i = 0; i < s.count; i++) {
          const tx=s.targets[i*3],ty=s.targets[i*3+1],tz=s.targets[i*3+2];
          const dx=tx-s.pos[i*3], dy=ty-s.pos[i*3+1], dz=tz-s.pos[i*3+2];
          const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
          if (dist < 0.3) { s.targets[i*3]=(Math.random()-0.5)*16; s.targets[i*3+1]=Math.random()*2+0.5; s.targets[i*3+2]=(Math.random()-0.5)*16; }
          else {
            s.pos[i*3]   += (dx/dist)*s.speeds[i]*dt;
            s.pos[i*3+1] += (dy/dist)*s.speeds[i]*dt + Math.sin(s.time*2+s.phases[i])*0.01;
            s.pos[i*3+2] += (dz/dist)*s.speeds[i]*dt;
          }
        }
        s.pts.geometry.attributes.position.needsUpdate = true;
      }
    }
    // Cleanup expired
    for (let s of toRemove) {
      this.scene.remove(s.ring || s.pts);
      if (s.pts) s.pts.geometry.dispose();
      this.systems.splice(this.systems.indexOf(s), 1);
    }
  }

  clearAll() {
    for (let s of this.systems) {
      if (s.pts) { this.scene.remove(s.pts); s.pts.geometry.dispose(); }
      if (s.ring) this.scene.remove(s.ring);
    }
    this.systems = [];
  }
}
