// ── Save / Load System ───────────────────────────────────
const SAVE_KEY = 'starfall_shores_save';

function saveGame(){
  try{
    const data = {
      zone: GS.currentZone,
      px: GS.player.x, py: GS.player.y,
      inventory: GS.inventory,
      crystalsFound: GS.crystalsFound,
      quests: GS.quests,
      takenItems: {},
      dayTime: GS.dayTime || 0
    };
    // Record which items have been taken
    for(const [zoneName, zone] of Object.entries(ZONES)){
      data.takenItems[zoneName] = zone.items.filter(it=>it.taken).map(it=>it.id);
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e){ console.warn('Save failed:', e); }
}

function hasSave(){
  return !!localStorage.getItem(SAVE_KEY);
}

function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    GS.currentZone = data.zone || 'beach';
    GS.player.x = data.px || ZONES.beach.spawnX;
    GS.player.y = data.py || ZONES.beach.spawnY;
    GS.inventory = data.inventory || [];
    GS.crystalsFound = data.crystalsFound || 0;
    GS.quests = data.quests || {active:[], completed:[]};
    // Restore taken items
    if(data.takenItems){
      for(const [zoneName, ids] of Object.entries(data.takenItems)){
        if(ZONES[zoneName]){
          ZONES[zoneName].items.forEach(it=>{ if(ids.includes(it.id)) it.taken = true; });
        }
      }
    }
    GS.camera.x = GS.player.x - CFG.VIEW_W/2;
    GS.camera.y = GS.player.y - CFG.VIEW_H/2;
    // Recompute derived state from loaded inventory/crystals
    if(typeof recomputeItemEffects === 'function') recomputeItemEffects();
    if(typeof updateWorldState === 'function') updateWorldState();
    return true;
  } catch(e){ console.warn('Load failed:', e); return false; }
}

function deleteSave(){
  localStorage.removeItem(SAVE_KEY);
}

// ── Title Screen ─────────────────────────────────────────
function showTitleScreen(){
  GS.state = 'title';
  document.getElementById('title-screen').style.display = 'flex';
  // Show "Continue" button if a save exists
  const ts = document.getElementById('title-screen');
  let contBtn = document.getElementById('continue-btn');
  if(!contBtn && hasSave()){
    contBtn = document.createElement('button');
    contBtn.id = 'continue-btn';
    contBtn.textContent = '↩ Continue';
    contBtn.style.cssText = 'margin-top:8px;padding:10px 32px;background:rgba(180,140,200,0.25);border:2px solid rgba(245,234,213,0.4);border-radius:16px;color:#F5EAD5;font-size:14px;cursor:pointer;letter-spacing:2px;transition:all 0.3s;flex-shrink:0';
    contBtn.onmouseenter = ()=>{ contBtn.style.background='rgba(180,140,200,0.45)'; };
    contBtn.onmouseleave = ()=>{ contBtn.style.background='rgba(180,140,200,0.25)'; };
    contBtn.onclick = (e)=>{ e.stopPropagation(); continueGame(); };
    const startBtn = document.getElementById('start-btn');
    if(startBtn) startBtn.parentNode.insertBefore(contBtn, startBtn.nextSibling);
  }
}

function startGame(){
  GS.state = 'playing';
  document.getElementById('title-screen').style.display = 'none';
  // Init zones
  generateAllZones();
  initNPCs();
  // Place items in zones
  placeQuestItems();
  if(typeof placeQuestWorldItems === 'function') placeQuestWorldItems();
  if(typeof recomputeItemEffects === 'function') recomputeItemEffects();
  if(typeof updateWorldState === 'function') updateWorldState();
  // Set player starting position
  GS.player.x = ZONES.beach.spawnX;
  GS.player.y = ZONES.beach.spawnY;
  GS.currentZone = 'beach';
  GS.camera.x = GS.player.x - CFG.VIEW_W/2;
  GS.camera.y = GS.player.y - CFG.VIEW_H/2;
  // Init quests
  GS.quests = {active:[], completed:[]};
  GS.crystalsFound = 0;
  GS.inventory = [];
  GS.notifications = [];
  GS.particles = [];
  GS.ambientLife = [];
  GS.floatingTexts = [];
  GS.dialogue = {active:false, lines:[], lineIndex:0, charIndex:0, timer:0, seen:{}};
  // Setup mobile
  setupMobileControls();
  // Notification
  showNotification('✿ Welcome to Starfall Shores! ✿');
  setTimeout(()=>showNotification('Find the 5 Starfall Crystals!'), 2000);
  // Start music
  initAudio();
  playSound('music');
}

function continueGame(){
  GS.state = 'playing';
  document.getElementById('title-screen').style.display = 'none';
  generateAllZones();
  initNPCs();
  placeQuestItems();
  if(typeof placeQuestWorldItems === 'function') placeQuestWorldItems();
  if(typeof recomputeItemEffects === 'function') recomputeItemEffects();
  if(typeof updateWorldState === 'function') updateWorldState();
  // Load saved state (overwrites defaults set by above)
  const loaded = loadGame();
  if(!loaded){
    // Fallback to fresh start if load fails
    GS.player.x = ZONES.beach.spawnX;
    GS.player.y = ZONES.beach.spawnY;
    GS.currentZone = 'beach';
    GS.camera.x = GS.player.x - CFG.VIEW_W/2;
    GS.camera.y = GS.player.y - CFG.VIEW_H/2;
    GS.quests = {active:[], completed:[]};
    GS.crystalsFound = 0;
    GS.inventory = [];
  }
  GS.notifications = [];
  GS.particles = [];
  GS.dialogue = {active:false, lines:[], lineIndex:0, charIndex:0, timer:0, seen:{}};
  setupMobileControls();
  showNotification('✿ Welcome back to Starfall Shores! ✿');
  initAudio();
  playSound('music');
}

function placeQuestItems(){
  // Place quest items in various zones
  const T = CFG.TILE;
  // Shell Necklace in village
  ZONES.village.items.push({id:'shell_necklace',x:8*T,y:12*T,item:'Shell Necklace',icon:'📿',taken:false});
  // Forest Map in forest
  ZONES.forest.items.push({id:'forest_map',x:20*T,y:15*T,item:'Forest Map',icon:'🗺️',taken:false});
  // Crystal Lens in caves
  ZONES.caves.items.push({id:'crystal_lens',x:15*T,y:20*T,item:'Crystal Lens',icon:'🔮',taken:false});
  // Sturdy Pickaxe in beach
  ZONES.beach.items.push({id:'sturdy_pickaxe',x:25*T,y:20*T,item:'Sturdy Pickaxe',icon:'⛏️',taken:false});
  // Beacon Shard for Barnaby's lighthouse quest — in tide pools
  ZONES.beach.items.push({id:'beacon_shard',x:18*T,y:22*T,item:'Beacon Shard',icon:'💎',taken:false});
}
