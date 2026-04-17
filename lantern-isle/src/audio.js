// ============================================================
// AUDIO ENGINE — Procedural Web Audio API, zero downloads
// ============================================================
let ctx = null, muted = false, masterGain = null;
let layers = {}, activeLayers = new Set();

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain(); masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);
  buildMusicLayers();
  startAmbientLayer('base');
}

function note(freq, type='sine') {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o;
}
function gainNode(v=1) { const g = ctx.createGain(); g.gain.value = v; return g; }
function filterNode(freq=800, type='lowpass') {
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; return f;
}

function buildMusicLayers() {
  // Base drone
  layers.base = buildDrone();
  // Exploration melody
  layers.explore = buildPentatonicMelody();
}

function buildDrone() {
  const g = gainNode(0); g.connect(masterGain);
  const freqs = [130.81, 164.81, 196];
  const oscs = freqs.map(f => {
    const o = note(f + Math.random()*0.5, 'sine');
    const og = gainNode(0.06); o.connect(og); og.connect(g);
    o.start(); return o;
  });
  // LFO vibrato
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15;
  const lfoG = gainNode(2); lfo.connect(lfoG);
  freqs.forEach((f,i) => lfoG.connect(oscs[i].frequency));
  lfo.start();
  return { gainNode: g, start() { g.gain.linearRampToValueAtTime(0.35, ctx.currentTime+2); },
    stop() { g.gain.linearRampToValueAtTime(0, ctx.currentTime+2); } };
}

function buildPentatonicMelody() {
  const g = gainNode(0); g.connect(masterGain);
  const pentatonic = [261.63, 293.66, 329.63, 392, 440, 523.25];
  let step = 0, playing = false, timeoutId = null;
  function playNext() {
    if (!playing || muted) { timeoutId = setTimeout(playNext, 600); return; }
    const freq = pentatonic[Math.floor(Math.random()*pentatonic.length)];
    const o = note(freq, 'triangle');
    const og = gainNode(0); o.connect(og); og.connect(g);
    o.start();
    og.gain.linearRampToValueAtTime(0.15, ctx.currentTime+0.05);
    og.gain.linearRampToValueAtTime(0, ctx.currentTime+0.4);
    o.stop(ctx.currentTime+0.5);
    timeoutId = setTimeout(playNext, 300+Math.random()*600);
  }
  return { gainNode: g,
    start() { playing = true; g.gain.linearRampToValueAtTime(1, ctx.currentTime+1); playNext(); },
    stop() { playing = false; g.gain.linearRampToValueAtTime(0, ctx.currentTime+1); if(timeoutId) clearTimeout(timeoutId); }
  };
}

export function startAmbientLayer(name) {
  if (!ctx || activeLayers.has(name)) return;
  activeLayers.add(name);
  layers[name]?.start();
}
export function stopAmbientLayer(name) {
  if (!ctx || !activeLayers.has(name)) return;
  activeLayers.delete(name);
  layers[name]?.stop();
}
export function startExploreMusic() { if(ctx) { startAmbientLayer('base'); startAmbientLayer('explore'); } }

// SFX
export function sfxCrystalCollect() {
  if (!ctx || muted) return;
  const times = [0, 0.1, 0.2];
  const freqs = [523.25, 659.25, 783.99]; // C E G
  times.forEach((t, i) => {
    const o = note(freqs[i], 'triangle');
    const g = gainNode(0); o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime + t);
    g.gain.setValueAtTime(0, ctx.currentTime+t);
    g.gain.linearRampToValueAtTime(0.22, ctx.currentTime+t+0.04);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime+t+0.28);
    o.stop(ctx.currentTime+t+0.3);
    // shimmer overtone
    const o2 = note(freqs[i]*2, 'sine');
    const g2 = gainNode(0); o2.connect(g2); g2.connect(masterGain);
    o2.start(ctx.currentTime+t);
    g2.gain.setValueAtTime(0, ctx.currentTime+t);
    g2.gain.linearRampToValueAtTime(0.08, ctx.currentTime+t+0.03);
    g2.gain.linearRampToValueAtTime(0, ctx.currentTime+t+0.2);
    o2.stop(ctx.currentTime+t+0.25);
  });
}

export function sfxLanternPulse() {
  if (!ctx || muted) return;
  const o = note(220, 'sine');
  const g = gainNode(0); o.connect(g); g.connect(masterGain);
  const filter = filterNode(1200); g.connect(filter); filter.connect(masterGain);
  o.start(); g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.3, ctx.currentTime+0.08);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime+0.6);
  o.frequency.linearRampToValueAtTime(110, ctx.currentTime+0.6);
  o.stop(ctx.currentTime+0.65);
}

export function sfxFootstep() {
  if (!ctx || muted) return;
  const freq = 180 + Math.random()*40;
  const o = note(freq, 'sine');
  const g = gainNode(0); o.connect(g); g.connect(masterGain);
  o.start(); g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime+0.07);
  o.stop(ctx.currentTime+0.08);
}

export function sfxDialogue() {
  if (!ctx || muted) return;
  const o = note(880, 'sine');
  const g = gainNode(0); o.connect(g); g.connect(masterGain);
  o.start(); g.gain.setValueAtTime(0.06, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime+0.12);
  o.stop(ctx.currentTime+0.13);
}

export function sfxShrine() {
  if (!ctx || muted) return;
  const chord = [261.63, 329.63, 392, 523.25];
  chord.forEach((f, i) => {
    const o = note(f, 'triangle');
    const g = gainNode(0); o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime+i*0.06);
    g.gain.setValueAtTime(0, ctx.currentTime+i*0.06);
    g.gain.linearRampToValueAtTime(0.18, ctx.currentTime+i*0.06+0.1);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime+i*0.06+1.8);
    o.stop(ctx.currentTime+i*0.06+2);
  });
}

export function sfxClick() {
  if (!ctx || muted) return;
  const o = note(600, 'sine');
  const g = gainNode(0.08); o.connect(g); g.connect(masterGain);
  o.start(); g.gain.linearRampToValueAtTime(0, ctx.currentTime+0.06);
  o.stop(ctx.currentTime+0.07);
}

export function sfxWin() {
  if (!ctx || muted) return;
  const melody = [523.25,659.25,783.99,1046.5,783.99,880,1046.5];
  melody.forEach((f,i) => {
    const o = note(f, 'triangle');
    const g = gainNode(0); o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime+i*0.18);
    g.gain.setValueAtTime(0, ctx.currentTime+i*0.18);
    g.gain.linearRampToValueAtTime(0.2, ctx.currentTime+i*0.18+0.06);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime+i*0.18+0.5);
    o.stop(ctx.currentTime+i*0.18+0.55);
  });
}

export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
  return muted;
}
export function isMuted() { return muted; }
