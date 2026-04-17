// ═══════════════════════════════════════════════════════════════
// SYSTEMS.JS — Item Effects, World State, Cave Darkness,
//              Environmental Hazards, Quest World Items
// ═══════════════════════════════════════════════════════════════

// ── Item Effects Registry ────────────────────────────────────
const ITEM_EFFECTS = {
  'Lucky Compass': {
    passive: true,
    desc: 'Highlights the nearest Starfall Crystal on the minimap',
    onEquip() { GS.compassActive = true; },
    onUnequip() { GS.compassActive = false; }
  },
  'Cave Lantern': {
    passive: true,
    desc: 'Lights up dark caves, revealing hidden paths',
    onEquip() { GS.lanternActive = true; },
    onUnequip() { GS.lanternActive = false; }
  },
  'Coral Charm': {
    passive: true,
    desc: 'Lets you wade through shallow water tiles',
    onEquip() { GS.coralCharmActive = true; },
    onUnequip() { GS.coralCharmActive = false; }
  },
  'Shadow Cloak': {
    passive: true,
    desc: 'Dims your presence — NPCs in caves won\'t block your path',
    onEquip() { GS.shadowCloakActive = true; },
    onUnequip() { GS.shadowCloakActive = false; }
  }
};

function recomputeItemEffects() {
  // Reset all
  GS.compassActive = false;
  GS.lanternActive = false;
  GS.coralCharmActive = false;
  GS.shadowCloakActive = false;
  GS.speedMult = 1.0;
  // Apply from inventory
  (GS.inventory || []).forEach(item => {
    const fx = ITEM_EFFECTS[item.name];
    if (fx && fx.passive && fx.onEquip) fx.onEquip();
  });
  // Lucky Compass gives a 20% speed boost
  if (GS.compassActive) GS.speedMult = 1.2;
}

// ── World State — Reacts to crystalsFound ────────────────────
// Called after every crystal pickup and on load
function updateWorldState() {
  const n = GS.crystalsFound || 0;

  // Lighthouse: glows at night when ≥1 crystal restored
  GS.lighthouseActive = n >= 1;

  // Village plaza: flower pots bloom at ≥2
  GS.plazaBlooming = n >= 2;

  // Forest stream: clear (brighter) at ≥3
  GS.forestHealed = n >= 3;

  // Summit altar: emits beam at ≥4
  GS.altarBeamActive = n >= 4;

  // Full restoration at 5 handled by ending sequence
}

// ── Cave Darkness System ──────────────────────────────────────
function renderCaveDarkness(camX, camY) {
  if (GS.currentZone !== 'caves') return;
  if (GS.lanternActive) return; // lantern removes darkness

  const cx = GS.player.x - camX + 16;
  const cy = GS.player.y - camY + 16;
  const radius = 90;

  // Dark overlay with radial cutout around player
  const gradient = CTX.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(10,5,25,0)');
  gradient.addColorStop(0.6, 'rgba(10,5,25,0.55)');
  gradient.addColorStop(1, 'rgba(10,5,25,0.88)');

  CTX.fillStyle = gradient;
  CTX.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

  // Torch glow spots
  const zone = ZONES.caves;
  zone.objects.filter(o => o.type === 'torch').forEach(o => {
    const tx = o.x * CFG.TILE + 16 - camX;
    const ty = o.y * CFG.TILE + 8 - camY;
    const tg = CTX.createRadialGradient(tx, ty, 0, tx, ty, 55);
    const pulse = 0.18 + Math.sin(GS.time * 0.004 + o.x) * 0.06;
    tg.addColorStop(0, `rgba(255,180,60,${pulse})`);
    tg.addColorStop(1, 'rgba(255,140,40,0)');
    CTX.fillStyle = tg;
    CTX.beginPath(); CTX.arc(tx, ty, 55, 0, Math.PI * 2); CTX.fill();
  });
}

function renderLanternGlow(camX, camY) {
  if (GS.currentZone !== 'caves') return;
  if (!GS.lanternActive) return;
  // Warm lantern aura — full brightness but warm tint
  const cx = GS.player.x - camX + 16;
  const cy = GS.player.y - camY + 16;
  const lg = CTX.createRadialGradient(cx, cy, 0, cx, cy, 140);
  lg.addColorStop(0, 'rgba(255,200,100,0.08)');
  lg.addColorStop(0.7, 'rgba(255,160,60,0.04)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  CTX.fillStyle = lg;
  CTX.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
}

// ── Lighthouse Rendering ─────────────────────────────────────
function renderLighthouseGlow(camX, camY) {
  if (!GS.lighthouseActive) return;
  const isNight = GS.dayTime > 0.55 || GS.dayTime < 0.2;
  if (!isNight) return;

  const zone = ZONES[GS.currentZone];
  if (!zone) return;

  // Find lighthouse object in beach zone
  if (GS.currentZone === 'beach') {
    const lh = zone.objects.find(o => o.type === 'lighthouse');
    if (!lh) return;
    const T = CFG.TILE;
    const lx = lh.x * T + T - camX;
    const ly = lh.y * T - camY;

    // Rotating beam
    const beamAngle = (GS.time * 0.0008) % (Math.PI * 2);
    CTX.save();
    CTX.globalAlpha = 0.13;
    CTX.fillStyle = '#F2C46D';
    CTX.beginPath();
    CTX.moveTo(lx, ly);
    CTX.arc(lx, ly, 320, beamAngle - 0.18, beamAngle + 0.18);
    CTX.closePath();
    CTX.fill();
    CTX.globalAlpha = 1;
    CTX.restore();

    // Glow halo
    const halo = CTX.createRadialGradient(lx, ly, 0, lx, ly, 80);
    const pulse = 0.25 + Math.sin(GS.time * 0.003) * 0.08;
    halo.addColorStop(0, `rgba(242,196,109,${pulse})`);
    halo.addColorStop(1, 'rgba(242,196,109,0)');
    CTX.fillStyle = halo;
    CTX.beginPath(); CTX.arc(lx, ly, 80, 0, Math.PI * 2); CTX.fill();
  }
}

// ── Environmental Hazards ────────────────────────────────────

// Beach tide push: if player on water tile (tid=1) and no coral charm
function applyBeachTide(dt) {
  if (GS.currentZone !== 'beach') return;
  const T = CFG.TILE;
  const tx = Math.floor((GS.player.x + 16) / T);
  const ty = Math.floor((GS.player.y + 24) / T);
  const zone = ZONES.beach;
  if (!zone || !zone.tiles[ty]) return;
  const tid = zone.tiles[ty][tx];
  if (tid === 1) { // deep water
    if (!GS.coralCharmActive) {
      // Push east (away from water edge)
      GS.player.x += 28 * (dt / 1000);
      GS.player.y += 8 * (dt / 1000);
      if (!GS._tidePushNotified) {
        showNotification("⚠️ The tide pushes you back!");
        GS._tidePushNotified = true;
        setTimeout(() => { GS._tidePushNotified = false; }, 4000);
      }
    }
  }
}

// Summit wind: slow player + drift when on exposed tiles near edge
function applySummitWind(dt) {
  if (GS.currentZone !== 'summit') return;
  const T = CFG.TILE;
  const ty = Math.floor((GS.player.y + 24) / T);
  if (ty > 8) return; // only top portion of summit
  // Wind gusts every ~4s
  const gustCycle = Math.sin(GS.time * 0.0005) > 0.7;
  if (gustCycle) {
    const windX = Math.sin(GS.time * 0.001) * 22 * (dt / 1000);
    const windY = -6 * (dt / 1000);
    if (!checkCollision(GS.player.x + windX, GS.player.y, GS.currentZone))
      GS.player.x += windX;
    if (!checkCollision(GS.player.x, GS.player.y + windY, GS.currentZone))
      GS.player.y += windY;
    GS.screenShake = Math.max(GS.screenShake || 0, 1.5);
  }
}

// ── Quest World Items ────────────────────────────────────────
// Place special item rewards in the world (companion items for NPCs)
function placeQuestWorldItems() {
  const T = CFG.TILE;
  // Lucky Compass — reward from Pip after first meeting (placed in forest)
  if (ZONES.forest) {
    if (!ZONES.forest.items.find(i => i.id === 'lucky_compass')) {
      ZONES.forest.items.push({
        id: 'lucky_compass', x: 18 * T + 8, y: 8 * T + 8,
        item: 'Lucky Compass', icon: '🧭', taken: false,
        hint: "Pip's old compass, left at the forest clearing"
      });
    }
  }
  // Cave Lantern — skip if already placed by core.js (id:'lantern')
  // The lantern in core.js covers this; no duplicate needed.
  // Coral Charm — on the beach near the tide pools
  if (ZONES.beach) {
    if (!ZONES.beach.items.find(i => i.id === 'coral_charm')) {
      ZONES.beach.items.push({
        id: 'coral_charm', x: 22 * T + 8, y: 18 * T + 8,
        item: 'Coral Charm', icon: '🐚', taken: false,
        hint: 'A charm woven from sea coral, grants water-walking'
      });
    }
  }
  // Shadow Cloak — in the summit ruins
  if (ZONES.summit) {
    if (!ZONES.summit.items.find(i => i.id === 'shadow_cloak')) {
      ZONES.summit.items.push({
        id: 'shadow_cloak', x: 15 * T + 8, y: 6 * T + 8,
        item: 'Shadow Cloak', icon: '🧣', taken: false,
        hint: 'A tattered cloak imbued with shadow magic'
      });
    }
  }
}

// ── Minimap: Compass Crystal Highlight ──────────────────────
function getNearestCrystalPos() {
  if (!GS.compassActive) return null;
  const zone = ZONES[GS.currentZone];
  if (!zone) return null;
  let nearest = null, nearestDist = Infinity;
  (zone.items || []).forEach(item => {
    if (item.crystal && !item.taken) {
      const d = dist(GS.player.x, GS.player.y, item.x, item.y);
      if (d < nearestDist) { nearestDist = d; nearest = item; }
    }
  });
  return nearest;
}

// ── Update hook (called from game loop) ─────────────────────
function updateSystems(dt) {
  applyBeachTide(dt);
  applySummitWind(dt);
}

// ── Render hook (called from game loop after world) ─────────
function renderSystems(camX, camY) {
  renderLighthouseGlow(camX, camY);
  renderCaveDarkness(camX, camY);
  renderLanternGlow(camX, camY);
}
