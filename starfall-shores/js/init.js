// ── Input Handlers ───────────────────────────────────────
// ── Fast-Travel Map ─────────────────────────────────────
const MAP_ZONES = [
  {key:'beach',    label:'Starfall Beach',     icon:'🏖️', color:'#C8A86A', desc:'Sandy shore & lighthouse'},
  {key:'village',  label:'Cosy Village',       icon:'🏘️', color:'#8FAF70', desc:'Shops, NPCs & the plaza'},
  {key:'forest',   label:'Whispering Woods',   icon:'🌲', color:'#527A50', desc:'Ancient trees & clearings'},
  {key:'caves',    label:'Crystal Caves',      icon:'💎', color:'#5A4878', desc:'Glowing crystals & streams'},
  {key:'summit',   label:'Moonpeak Summit',    icon:'🏔️', color:'#7890A0', desc:'Icy peak above the clouds'},
  {key:'mayors_house',   label:"Mayor's House",      icon:'🏛️', color:'#C87878', desc:'Town hall interior'},
  {key:'pips_house',     label:"Pip's House",         icon:'🏠', color:'#7890B0', desc:"Pip's cosy room"},
  {key:'general_store',  label:'General Store',        icon:'🏪', color:'#B8A078', desc:'Island Compass & supplies'},
  {key:'lunas_observatory', label:"Luna's Observatory",icon:'🔭', color:'#7A60A0', desc:'Star charts & telescope'},
];

function buildMapGrid(){
  const grid = document.getElementById('map-grid');
  if(!grid) return;
  grid.innerHTML = '';
  MAP_ZONES.forEach(z=>{
    const btn = document.createElement('button');
    const isCurrent = GS.currentZone === z.key;
    btn.style.cssText = `
      background:${isCurrent ? 'rgba(187,168,217,0.25)' : 'rgba(255,255,255,0.06)'};
      border:1px solid ${isCurrent ? 'rgba(187,168,217,0.6)' : 'rgba(255,255,255,0.12)'};
      border-radius:12px; padding:10px 12px; cursor:${isCurrent?'default':'pointer'};
      text-align:left; color:#e8e0f0; font-family:inherit; transition:background 0.15s;
      display:flex; align-items:center; gap:10px;
    `;
    btn.innerHTML = `
      <span style="font-size:22px;flex-shrink:0">${z.icon}</span>
      <span>
        <div style="font-size:12px;font-weight:bold;color:${isCurrent?'#BBA8D9':'#e8e0f0'}">${z.label}${isCurrent?' <span style=\'font-size:10px;color:#BBA8D9\'>(here)</span>':''}</div>
        <div style="font-size:10px;color:#9a88b0;margin-top:2px">${z.desc}</div>
      </span>`;
    if(!isCurrent){
      btn.onmouseenter = ()=>btn.style.background='rgba(187,168,217,0.15)';
      btn.onmouseleave = ()=>btn.style.background='rgba(255,255,255,0.06)';
      btn.onclick = ()=>{ fastTravel(z.key); };
    }
    grid.appendChild(btn);
  });
}

function fastTravel(zoneName){
  const zone = ZONES[zoneName];
  if(!zone) return;
  closeMap();
  GS.transitioning = true;
  GS.transitionAlpha = 0;
  GS.transitionPhase = 'out';
  GS.transitionTarget = { zone: zoneName, x: zone.spawnX, y: zone.spawnY };
  // Reuse existing transition system
  const fakeT = {zone: zoneName, toX: zone.spawnX, toY: zone.spawnY};
  startTransition(fakeT.zone, fakeT.toX, fakeT.toY);
}

function openMap(){
  if(GS.state!=='playing') return;
  buildMapGrid();
  document.getElementById('map-panel').style.display='block';
}
function closeMap(){
  document.getElementById('map-panel').style.display='none';
}
function toggleMap(){
  const p = document.getElementById('map-panel');
  if(p.style.display==='none') openMap(); else closeMap();
}

document.addEventListener('keydown', e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyI','KeyQ','KeyM','Escape','Enter'].includes(e.code)) e.preventDefault();
  INPUT.keys[e.code] = true;
  INPUT.keys[e.key] = true;
  if(e.code==='Space'||e.code==='KeyE'){
    interact();
  }
  if(e.code==='KeyI'){
    toggleInventory();
  }
  if(e.code==='KeyQ'){
    toggleQuestLog();
  }
  if(e.code==='KeyM'){
    toggleMap();
  }
});
document.addEventListener('keyup', e=>{
  INPUT.keys[e.code] = false;
  INPUT.keys[e.key] = false;
});

// Canvas click for dialogue advance
canvas.addEventListener('click', e=>{
  if(GS.dialogue.active){
    advanceDialogue();
  }
});

// ── Resize Handler ───────────────────────────────────────
function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  CFG.VIEW_W = w;
  CFG.VIEW_H = h;
  CFG.DPR = dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Start Button ─────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', ()=>{
  startGame();
});

// ── Close Buttons for Panels ─────────────────────────────
document.querySelectorAll('.panel-close').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    btn.parentElement.style.display = 'none';
  });
});

// ── Inventory & Quest Toggle Buttons ─────────────────────
document.getElementById('inv-btn').addEventListener('click', toggleInventory);
document.getElementById('map-btn').addEventListener('click', toggleMap);
document.getElementById('quest-btn').addEventListener('click', toggleQuestLog);

// ── Initialize ───────────────────────────────────────────
showTitleScreen();
requestAnimationFrame(gameLoop);

