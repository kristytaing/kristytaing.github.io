// ── Quest System ─────────────────────────────────────────
function checkQuestProgress(){
  // Check main quest crystal count
  GS.crystalsFound = GS.inventory.filter(i=>i.crystal).length;
}

// ── Notifications ────────────────────────────────────────
function showNotification(text){
  GS.notifications.push({text, timer: 3, alpha: 1});
}

function updateNotifications(dt){
  for(let i=GS.notifications.length-1;i>=0;i--){
    GS.notifications[i].timer -= dt;
    if(GS.notifications[i].timer < 0.5){
      GS.notifications[i].alpha = GS.notifications[i].timer / 0.5;
    }
    if(GS.notifications[i].timer <= 0){
      GS.notifications.splice(i,1);
    }
  }
  // Update floating texts with real dt
  GS.floatingTexts = GS.floatingTexts || [];
  for(let i=GS.floatingTexts.length-1;i>=0;i--){
    const ft = GS.floatingTexts[i];
    ft.life -= dt;
    ft.y -= 30 * dt; // float upward at 30px/s
    if(ft.life <= 0) GS.floatingTexts.splice(i,1);
  }
}

function renderNotifications(){
  for(let i=0;i<GS.notifications.length;i++){
    const n = GS.notifications[i];
    CTX.globalAlpha = n.alpha;
    CTX.fillStyle = 'rgba(255,245,250,0.92)';
    CTX.font = '13px sans-serif';
    const tw = CTX.measureText(n.text).width;
    const nx = CFG.VIEW_W/2 - tw/2 - 10;
    const ny = 60 + i*30;
    CTX.beginPath(); CTX.roundRect(nx, ny, tw+20, 24, 8); CTX.fill();
    CTX.strokeStyle = 'rgba(200,150,180,0.5)';
    CTX.lineWidth = 1;
    CTX.beginPath(); CTX.roundRect(nx, ny, tw+20, 24, 8); CTX.stroke();
    CTX.fillStyle = '#805070';
    CTX.textAlign = 'center';
    CTX.fillText(n.text, CFG.VIEW_W/2, ny+16);
    CTX.textAlign = 'left';
    CTX.globalAlpha = 1;
  }
  // Floating pickup texts (updated in updateNotifications)
  GS.floatingTexts = GS.floatingTexts || [];
  for(let i=0; i<GS.floatingTexts.length; i++){
    const ft = GS.floatingTexts[i];
    const a = Math.min(1, ft.life / ft.maxLife * 2);
    const sx = ft.x - GS.camera.x;
    const sy = ft.y - GS.camera.y;
    CTX.save();
    CTX.globalAlpha = a;
    CTX.font = 'bold 14px sans-serif';
    CTX.textAlign = 'center';
    // Shadow for readability
    CTX.fillStyle = 'rgba(0,0,0,0.4)';
    CTX.fillText(ft.text, sx+1, sy+1);
    CTX.fillStyle = ft.crystal ? '#e8c0ff' : '#fff8e8';
    CTX.fillText(ft.text, sx, sy);
    CTX.restore();
  }
}

// ── Tutorial Hints ───────────────────────────────────────
const TUTORIAL_HINTS = [
  { id:'move',    text:'Use Arrow Keys or WASD to move',          trigger: gs => !gs._tutMove,    flag:'_tutMove',    delay:2  },
  { id:'talk',    text:'Walk up to characters and press E to talk', trigger: gs => gs._tutMove && !gs._tutTalk, flag:'_tutTalk', delay:4 },
  { id:'map',     text:'Press M or tap 🗺️ to open the fast-travel map', trigger: gs => gs._tutTalk && !gs._tutMap, flag:'_tutMap', delay:6 },
  { id:'inv',     text:'Press I or tap 🎒 to check your inventory', trigger: gs => gs._tutMap && !gs._tutInv, flag:'_tutInv', delay:8 },
  { id:'crystal', text:'Find the 5 Starfall Crystals to restore the island!', trigger: gs => gs._tutInv && !gs._tutCrystal, flag:'_tutCrystal', delay:10 },
];
let _tutTimer = 0;
function updateTutorial(dt){
  if(GS.dialogue && GS.dialogue.active) return;
  if(GS.ending) return;
  _tutTimer += dt;
  for(const hint of TUTORIAL_HINTS){
    if(!GS[hint.flag] && _tutTimer >= hint.delay && hint.trigger(GS)){
      GS[hint.flag] = true;
      showTutorialHint(hint.text);
      break;
    }
  }
  // Mark movement as triggered once player moves
  if(!GS._tutMove && (INPUT.left||INPUT.right||INPUT.up||INPUT.down||
     (INPUT.joystick && INPUT.joystick.active))){
    GS._tutMove = true;
  }
}
let _tutHint = null;
function showTutorialHint(text){
  _tutHint = { text, life: 4, maxLife: 4 };
}
function renderTutorialHint(){
  if(!_tutHint || _tutHint.life <= 0) return;
  const a = Math.min(1, _tutHint.life / _tutHint.maxLife * 2.5);
  const y = CFG.VIEW_H - 52;
  const tw = CTX.measureText(_tutHint.text).width + 24;
  const x = CFG.VIEW_W/2 - tw/2;
  CTX.save();
  CTX.globalAlpha = a * 0.9;
  CTX.fillStyle = 'rgba(30,15,50,0.82)';
  CTX.beginPath(); CTX.roundRect(x, y, tw, 28, 10); CTX.fill();
  CTX.strokeStyle = 'rgba(180,140,220,0.6)';
  CTX.lineWidth = 1;
  CTX.beginPath(); CTX.roundRect(x, y, tw, 28, 10); CTX.stroke();
  CTX.globalAlpha = a;
  CTX.fillStyle = '#e8d8ff';
  CTX.font = '12px sans-serif';
  CTX.textAlign = 'center';
  CTX.fillText(_tutHint.text, CFG.VIEW_W/2, y + 18);
  CTX.restore();
}

// ── Part 8: UI Systems ───────────────────────────────────
function toggleInventory(){
  const panel = document.getElementById('inventory-panel');
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if(!isOpen) renderInventoryUI();
  // Close quest log if open
  if(!isOpen) document.getElementById('quest-panel').style.display = 'none';
}

function toggleQuestLog(){
  const panel = document.getElementById('quest-panel');
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if(!isOpen) renderQuestUI();
  // Close inventory if open
  if(!isOpen) document.getElementById('inventory-panel').style.display = 'none';
}

function renderInventoryUI(){
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';
  if(GS.inventory.length === 0){
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#b0a0b0;padding:20px;">No items yet! Explore the island to find treasures.</div>';
    return;
  }
  const ITEM_DESCS = {
    'Coral Charm':    'Walk through shallow water',
    'Lucky Compass':  'Minimap shows nearest crystal',
    'Shadow Cloak':   'Slip past cave guardians',
    'Cave Lantern':   'Lights up dark cave areas',
    'Forest Map':     'Reveals forest shortcuts',
    'Shell Necklace': 'A beautiful sea treasure',
    'Crystal Lens':   'Read ancient inscriptions',
    'Beacon Shard':   'Powers the old lighthouse',
  };
  GS.inventory.forEach(item=>{
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.title = ITEM_DESCS[item.name] || '';
    const desc = ITEM_DESCS[item.name] ? `<div style="font-size:8px;color:#a08898;margin-top:2px;line-height:1.2">${ITEM_DESCS[item.name]}</div>` : '';
    slot.innerHTML = `<span style="font-size:20px">${item.icon||'✦'}</span><br><span style="font-size:9px;color:#907080">${item.name}</span>${desc}`;
    if(item.crystal) slot.style.background = 'rgba(200,160,230,0.2)';
    grid.appendChild(slot);
  });
}

function renderQuestUI(){
  const content = document.getElementById('quest-content');
  content.innerHTML = '';
  // Main quest
  const mainDiv = document.createElement('div');
  mainDiv.style.cssText = 'margin-bottom:12px;padding:8px;background:rgba(220,180,220,0.15);border-radius:8px;';
  mainDiv.innerHTML = `<div style="font-weight:bold;color:#906080;margin-bottom:4px;">✦ Main Quest: Restore the Star Anchor</div>
    <div style="font-size:12px;color:#806070;">Crystals: ${GS.crystalsFound||0}/5</div>
    <div style="margin-top:4px;height:6px;background:rgba(200,180,200,0.3);border-radius:3px;">
      <div style="height:100%;width:${((GS.crystalsFound||0)/5)*100}%;background:linear-gradient(90deg,#d0a0d0,#e0c0e0);border-radius:3px;"></div>
    </div>`;
  content.appendChild(mainDiv);
  // Active quests
  if(GS.quests.active && GS.quests.active.length>0){
    GS.quests.active.forEach(q=>{
      const qDiv = document.createElement('div');
      qDiv.style.cssText = 'margin-bottom:8px;padding:6px;background:rgba(200,180,220,0.1);border-radius:6px;';
      const hasItem = GS.inventory.some(i=>i.name===q.need);
      qDiv.innerHTML = `<div style="font-weight:bold;font-size:12px;color:#806080;">✿ ${q.name}</div>
        <div style="font-size:11px;color:#907888;margin-top:2px;">Find: ${q.need} ${hasItem?'✓':'○'}</div>`;
      content.appendChild(qDiv);
    });
  }
  // Completed
  if(GS.quests.completed && GS.quests.completed.length>0){
    const doneDiv = document.createElement('div');
    doneDiv.style.cssText = 'margin-top:8px;padding:6px;opacity:0.6;';
    doneDiv.innerHTML = `<div style="font-size:11px;color:#a090a0;">Completed: ${GS.quests.completed.length} quest(s)</div>`;
    content.appendChild(doneDiv);
  }
}

// ── HUD ──────────────────────────────────────────────────
function hudRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function renderHUD(){
  const hp = GS.player.hp !== undefined ? GS.player.hp : 3;
  const maxHp = GS.player.maxHp !== undefined ? GS.player.maxHp : 3;
  const coins = GS.player.coins !== undefined ? GS.player.coins : 0;

  // ── Hearts (top-left pill) ──────────────────────────────
  const heartPad = 10, heartSize = 20, heartGap = 4;
  const hpW = maxHp * (heartSize + heartGap) - heartGap + heartPad*2;
  const hpH = 36;
  CTX.fillStyle = '#F5EAD5';
  hudRoundRect(CTX, 14, 12, hpW, hpH, 14);
  CTX.fill();
  CTX.strokeStyle = 'rgba(187,168,217,0.55)';
  CTX.lineWidth = 2;
  hudRoundRect(CTX, 14, 12, hpW, hpH, 14);
  CTX.stroke();
  for(let i=0;i<maxHp;i++){
    const hx = 14 + heartPad + i*(heartSize+heartGap) + heartSize/2;
    const hy = 12 + hpH/2;
    CTX.font = (heartSize-2)+'px sans-serif';
    CTX.textAlign = 'center';
    CTX.textBaseline = 'middle';
    CTX.fillText(i < hp ? '❤️' : '🤍', hx, hy+1);
  }

  // ── Coin counter (top-right pill) ──────────────────────
  CTX.font = 'bold 13px sans-serif';
  CTX.textAlign = 'left';
  CTX.textBaseline = 'alphabetic';
  const coinLabel = 'COINS: ' + coins;
  const coinW = CTX.measureText(coinLabel).width + 48;
  const coinX = CFG.VIEW_W - coinW - 14;
  CTX.fillStyle = '#F5EAD5';
  hudRoundRect(CTX, coinX, 12, coinW, 36, 14);
  CTX.fill();
  CTX.strokeStyle = 'rgba(187,168,217,0.55)';
  CTX.lineWidth = 2;
  hudRoundRect(CTX, coinX, 12, coinW, 36, 14);
  CTX.stroke();
  // Coin icon
  CTX.font = '18px sans-serif';
  CTX.textAlign = 'center';
  CTX.textBaseline = 'middle';
  CTX.fillText('🪙', coinX + coinW - 22, 30);
  CTX.fillStyle = '#3D2B5E';
  CTX.font = 'bold 13px sans-serif';
  CTX.textAlign = 'left';
  CTX.textBaseline = 'middle';
  CTX.fillText(coinLabel, coinX + 12, 30);

  // ── Star Altar reminder (all 5 crystals, not yet ended) ─
  if((GS.crystalsFound||0) >= 5 && !GS.ending){
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 400);
    const altarMsg = '✦ Head to the Summit Altar! ✦';
    CTX.font = 'bold 13px sans-serif';
    const aw = CTX.measureText(altarMsg).width;
    CTX.fillStyle = `rgba(180,120,220,${0.85 * pulse})`;
    hudRoundRect(CTX, CFG.VIEW_W/2 - aw/2 - 14, 56, aw + 28, 26, 10);
    CTX.fill();
    CTX.fillStyle = `rgba(255,240,255,${pulse})`;
    CTX.textAlign = 'center';
    CTX.textBaseline = 'middle';
    CTX.fillText(altarMsg, CFG.VIEW_W/2, 69);
    CTX.textAlign = 'left';
    CTX.textBaseline = 'alphabetic';
  }

  // ── Interaction hint (bottom center) ───────────────────
  CTX.textAlign = 'left';
  CTX.textBaseline = 'alphabetic';
  if(!GS.dialogue.active){
    let hint = null;
    if(GS.player.nearNPC) hint = isMobile() ? 'Tap 💬 to talk' : 'Press E to talk';
    else if(GS.player.nearItem) hint = isMobile() ? 'Tap ✦ to pick up' : 'Press E to pick up';
    if(hint){
      CTX.font = '12px sans-serif';
      const hw = CTX.measureText(hint).width;
      CTX.fillStyle = '#F5EAD5';
      hudRoundRect(CTX, CFG.VIEW_W/2-hw/2-12, CFG.VIEW_H-52, hw+24, 26, 10);
      CTX.fill();
      CTX.strokeStyle = 'rgba(187,168,217,0.45)';
      CTX.lineWidth = 1.5;
      hudRoundRect(CTX, CFG.VIEW_W/2-hw/2-12, CFG.VIEW_H-52, hw+24, 26, 10);
      CTX.stroke();
      CTX.fillStyle = '#3D2B5E';
      CTX.textAlign = 'center';
      CTX.fillText(hint, CFG.VIEW_W/2, CFG.VIEW_H-35);
      CTX.textAlign = 'left';
    }
  }
}

function isMobile(){
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ── Minimap ──────────────────────────────────────────────
function renderMinimap(){
  const z = ZONES[GS.currentZone];
  if(!z) return;
  const mmW = 100, mmH = 75;
  const mx = CFG.VIEW_W - mmW - 10;
  const my = CFG.VIEW_H - mmH - 10;
  // Background
  CTX.fillStyle = 'rgba(255,245,250,0.8)';
  CTX.fillRect(mx-2, my-2, mmW+4, mmH+4);
  CTX.strokeStyle = 'rgba(200,150,180,0.5)';
  CTX.lineWidth = 1;
  CTX.strokeRect(mx-2, my-2, mmW+4, mmH+4);
  // Tiles
  const scaleX = mmW / z.w;
  const scaleY = mmH / z.h;
  const colors = TILE_COLORS[GS.currentZone]||TILE_COLORS.beach;
  for(let y=0;y<z.h;y+=2){
    for(let x=0;x<z.w;x+=2){
      const tid = z.tiles[y]?z.tiles[y][x]:0;
      CTX.fillStyle = colors[tid]||'#90c890';
      CTX.fillRect(mx+x*scaleX, my+y*scaleY, scaleX*2+1, scaleY*2+1);
    }
  }
  // Player dot
  const T = CFG.TILE;
  const px = mx + (GS.player.x/T)*scaleX;
  const py = my + (GS.player.y/T)*scaleY;
  const blink = Math.sin(GS.time*0.008)>0;
  CTX.fillStyle = blink?'#f080a0':'#fff';
  CTX.beginPath(); CTX.arc(px, py, 3, 0, Math.PI*2); CTX.fill();
  // NPC dots
  for(const npc of z.npcs){
    const nx = mx + (npc.x/T)*scaleX;
    const ny = my + (npc.y/T)*scaleY;
    CTX.fillStyle = '#a080d0';
    CTX.beginPath(); CTX.arc(nx, ny, 2, 0, Math.PI*2); CTX.fill();
  }
  // Item dots
  for(const item of z.items){
    if(item.taken) continue;
    const ix = mx + (item.x/T)*scaleX;
    const iy = my + (item.y/T)*scaleY;
    // Pulse crystal dots
    if(item.crystal){
      const pulse = 0.5 + 0.5*Math.sin(GS.time*0.006);
      CTX.fillStyle = `rgba(208,160,240,${0.6+0.4*pulse})`;
      CTX.beginPath(); CTX.arc(ix, iy, 2+pulse, 0, Math.PI*2); CTX.fill();
    } else {
      CTX.fillStyle = '#f0d080';
      CTX.beginPath(); CTX.arc(ix, iy, 2, 0, Math.PI*2); CTX.fill();
    }
  }
  // Compass arrow: point toward nearest crystal (requires Lucky Compass)
  const hasCompass = GS.inventory && GS.inventory.some(i=>i.name==='Lucky Compass');
  if(hasCompass && typeof getNearestCrystalPos === 'function'){
    const cp = getNearestCrystalPos();
    if(cp){
      const cx = mx + (cp.x/T)*scaleX;
      const cy = my + (cp.y/T)*scaleY;
      const angle = Math.atan2(cy-py, cx-px);
      const pulse2 = 0.7 + 0.3*Math.sin(GS.time*0.008);
      CTX.save();
      CTX.translate(px, py);
      CTX.rotate(angle);
      CTX.globalAlpha = pulse2;
      CTX.strokeStyle = '#ffdd44';
      CTX.lineWidth = 1.5;
      CTX.beginPath();
      CTX.moveTo(0, 0);
      CTX.lineTo(7, 0);
      CTX.moveTo(5, -2);
      CTX.lineTo(7, 0);
      CTX.lineTo(5, 2);
      CTX.stroke();
      CTX.globalAlpha = 1;
      CTX.restore();
    }
  }
}

// ── Mobile Controls ──────────────────────────────────────
function setupMobileControls(){
  if(!isMobile()) {
    document.getElementById('mobile-controls').style.display = 'none';
    return;
  }
  document.getElementById('mobile-controls').style.display = 'block';
  const joystickArea = document.getElementById('joystick-area');
  const actionBtns = document.getElementById('action-buttons');
  // Joystick
  let joyCenter = {x:0,y:0};
  let joyActive = false;
  joystickArea.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t = e.touches[0];
    const rect = joystickArea.getBoundingClientRect();
    joyCenter = {x:t.clientX-rect.left, y:t.clientY-rect.top};
    joyActive = true;
    INPUT.joystick.active = true;
  }, {passive:false});
  joystickArea.addEventListener('touchmove', e=>{
    e.preventDefault();
    if(!joyActive) return;
    const t = e.touches[0];
    const rect = joystickArea.getBoundingClientRect();
    const cx = t.clientX-rect.left;
    const cy = t.clientY-rect.top;
    const dx = cx-joyCenter.x;
    const dy = cy-joyCenter.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const maxDist = 40;
    if(dist > 0){
      INPUT.joystick.dx = (dx/Math.max(dist,maxDist));
      INPUT.joystick.dy = (dy/Math.max(dist,maxDist));
    }
  }, {passive:false});
  const endJoy = ()=>{
    joyActive = false;
    INPUT.joystick.active = false;
    INPUT.joystick.dx = 0;
    INPUT.joystick.dy = 0;
  };
  joystickArea.addEventListener('touchend', endJoy);
  joystickArea.addEventListener('touchcancel', endJoy);
  // Action button
  const actBtn = document.createElement('button');
  actBtn.textContent = '💬';
  actBtn.style.cssText = 'width:50px;height:50px;border-radius:50%;background:rgba(255,240,250,0.9);border:2px solid rgba(200,150,180,0.5);font-size:20px;margin:4px;';
  actBtn.addEventListener('touchstart', e=>{e.preventDefault(); interact();}, {passive:false});
  actionBtns.appendChild(actBtn);
  // Inventory button
  const invBtn = document.createElement('button');
  invBtn.textContent = '🎒';
  invBtn.style.cssText = 'width:50px;height:50px;border-radius:50%;background:rgba(255,240,250,0.9);border:2px solid rgba(200,150,180,0.5);font-size:20px;margin:4px;';
  invBtn.addEventListener('touchstart', e=>{e.preventDefault(); toggleInventory();}, {passive:false});
  actionBtns.appendChild(invBtn);
}

// ── Part 9: Post-Processing & Particles ──────────────────
function renderPostProcessing(){
  const z = ZONES[GS.currentZone];
  if(!z) return;
  // Ambient color overlay (warm pastel tint)
  CTX.fillStyle = z.ambientColor || 'rgba(240,200,220,0.06)';
  CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
  CTX.globalAlpha = 1;
  // ── Day/Night color temperature overlay ──────────────────
  // dayTime cycles 0→1 over DAY_LENGTH seconds. 0=dawn,0.25=noon,0.5=dusk,0.75=night
  GS.dayTime = ((GS.time * 0.001) / CFG.DAY_LENGTH) % 1;
  const d = GS.dayTime;
  let overlayColor, overlayAlpha;
  if(d < 0.15){       // dawn: warm amber
    const t = d/0.15;
    overlayColor = `rgba(255,180,80,${0.18*(1-t)+0.04*t})`;
    overlayAlpha = 1;
  } else if(d < 0.35){ // day: clear, very faint warm
    overlayColor = 'rgba(255,220,160,0.04)';
    overlayAlpha = 1;
  } else if(d < 0.55){ // dusk: deep orange-rose
    const t = (d-0.35)/0.2;
    overlayColor = `rgba(255,120,60,${0.04+t*0.22})`;
    overlayAlpha = 1;
  } else if(d < 0.7){  // twilight: fade to blue
    const t = (d-0.55)/0.15;
    overlayColor = `rgba(60,80,160,${0.26*t})`;
    overlayAlpha = 1;
  } else {             // night: cool deep blue
    overlayColor = 'rgba(20,30,100,0.30)';
    overlayAlpha = 1;
  }
  CTX.globalAlpha = overlayAlpha;
  CTX.fillStyle = overlayColor;
  CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
  CTX.globalAlpha = 1;
  // Stars at night
  if(d > 0.6 || d < 0.1){
    const starAlpha = d > 0.7 ? 0.7 : d < 0.05 ? 0.5 : 0.3;
    CTX.globalAlpha = starAlpha;
    for(let i=0;i<40;i++){
      const sx = (tileHash(i,0,1)*CFG.VIEW_W+GS.time*0.003*(i%3?0.2:-0.1))%CFG.VIEW_W;
      const sy = (tileHash(0,i,2)*CFG.VIEW_H*0.5);
      const twinkle = 0.5+Math.sin(GS.time*0.002+i)*0.5;
      CTX.fillStyle='#fff';
      CTX.beginPath();
      CTX.arc(sx, sy, 0.8+twinkle*0.7, 0, Math.PI*2);
      CTX.fill();
    }
    CTX.globalAlpha = 1;
  }
  // Soft vignette
  const vGrad = CTX.createRadialGradient(
    CFG.VIEW_W/2,CFG.VIEW_H/2, CFG.VIEW_W*0.3,
    CFG.VIEW_W/2,CFG.VIEW_H/2, CFG.VIEW_W*0.75
  );
  vGrad.addColorStop(0,'rgba(0,0,0,0)');
  vGrad.addColorStop(1,'rgba(80,50,70,0.12)');
  CTX.fillStyle = vGrad;
  CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
  // Zone fog
  if(z.fogColor){
    CTX.globalAlpha = 0.06;
    CTX.fillStyle = z.fogColor;
    CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
    CTX.globalAlpha = 1;
  }
}

function updateParticles(dt){
  const z = ZONES[GS.currentZone];
  const zp = ZONE_PARTICLES[GS.currentZone];
  if(zp){
    // Spawn ambient particles
    if(Math.random() < zp.rate*dt){
      const px = GS.camera.x + Math.random()*CFG.VIEW_W;
      const py = GS.camera.y + Math.random()*CFG.VIEW_H;
      GS.particles.push({
        x:px, y:py,
        vx:(Math.random()-0.5)*zp.speed,
        vy: -0.3 - Math.random()*zp.speed*0.5,
        life:1, maxLife:1,
        size:1+Math.random()*zp.size,
        color: zp.colors[Math.floor(Math.random()*zp.colors.length)],
        gravity: -0.005,
        wobble: Math.random()*Math.PI*2
      });
    }
  }
  // Update existing
  for(let i=GS.particles.length-1;i>=0;i--){
    const p = GS.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if(p.gravity) p.vy += p.gravity;
    if(p.wobble !== undefined){
      p.wobble += 0.05;
      p.x += Math.sin(p.wobble)*0.3;
    }
    p.life -= dt * 0.3;
    if(p.life <= 0){
      GS.particles.splice(i,1);
    }
  }
}

function renderParticles(camX, camY){
  for(const p of GS.particles){
    const sx = p.x - camX;
    const sy = p.y - camY;
    if(sx<-20||sx>CFG.VIEW_W+20||sy<-20||sy>CFG.VIEW_H+20) continue;
    CTX.globalAlpha = p.life * 0.6;
    CTX.fillStyle = p.color;
    CTX.beginPath();
    CTX.arc(sx, sy, p.size * p.life, 0, Math.PI*2);
    CTX.fill();
  }
  CTX.globalAlpha = 1;
}


// ── Ambient Life ─────────────────────────────────────────
GS.ambientLife = GS.ambientLife || [];

function updateAmbientLife(dt){
  GS.ambientLife = GS.ambientLife || [];
  const zone = GS.currentZone;
  const d = GS.dayTime || 0;
  const T = CFG.TILE;

  // Seagulls on beach (always, 3-5 of them)
  if(zone === 'beach'){
    // Spawn if fewer than 4
    while(GS.ambientLife.filter(a=>a.type==='seagull').length < 4){
      GS.ambientLife.push({
        type:'seagull',
        x: GS.camera.x + Math.random()*CFG.VIEW_W,
        y: GS.camera.y + Math.random()*CFG.VIEW_H*0.4,
        vx: (Math.random()<0.5?1:-1)*(25+Math.random()*20),
        vy: (Math.random()-0.5)*5,
        flapTimer:0, flapFrame:0,
        life:8+Math.random()*6
      });
    }
  } else {
    // Remove seagulls when leaving beach
    GS.ambientLife = GS.ambientLife.filter(a=>a.type!=='seagull');
  }

  // Fireflies in forest at night/dusk
  if(zone === 'forest' && (d > 0.5 || d < 0.15)){
    const nightIntensity = d > 0.65 ? 1 : d > 0.5 ? (d-0.5)/0.15 : d < 0.05 ? 1 : d/0.15;
    const targetCount = Math.floor(nightIntensity * 18);
    while(GS.ambientLife.filter(a=>a.type==='firefly').length < targetCount){
      GS.ambientLife.push({
        type:'firefly',
        x: GS.camera.x + Math.random()*CFG.VIEW_W,
        y: GS.camera.y + CFG.VIEW_H*0.2 + Math.random()*CFG.VIEW_H*0.6,
        vx:(Math.random()-0.5)*12,
        vy:(Math.random()-0.5)*8,
        wobble:Math.random()*Math.PI*2,
        glowTimer:Math.random()*3,
        life:4+Math.random()*6
      });
    }
  } else if(zone !== 'forest'){
    GS.ambientLife = GS.ambientLife.filter(a=>a.type!=='firefly');
  }

  // Update all
  for(let i=GS.ambientLife.length-1;i>=0;i--){
    const a = GS.ambientLife[i];
    a.life -= dt;
    if(a.life <= 0){ GS.ambientLife.splice(i,1); continue; }

    if(a.type==='seagull'){
      a.flapTimer += dt;
      a.flapFrame = Math.floor(a.flapTimer*4)%2;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vy += (Math.random()-0.5)*2*dt;
      a.vy = Math.max(-8, Math.min(8, a.vy));
      // Gentle drift — keep loosely on screen
      if(a.x < GS.camera.x - 60) a.vx = Math.abs(a.vx);
      if(a.x > GS.camera.x + CFG.VIEW_W + 60) a.vx = -Math.abs(a.vx);
    }

    if(a.type==='firefly'){
      a.wobble += dt*1.5;
      a.glowTimer += dt;
      a.vx += (Math.random()-0.5)*8*dt;
      a.vy += (Math.random()-0.5)*8*dt;
      a.vx = Math.max(-15,Math.min(15,a.vx));
      a.vy = Math.max(-10,Math.min(10,a.vy));
      a.x += a.vx*dt + Math.sin(a.wobble)*0.3;
      a.y += a.vy*dt + Math.cos(a.wobble*0.7)*0.2;
    }
  }
}

function renderAmbientLife(camX, camY){
  if(!GS.ambientLife) return;
  for(const a of GS.ambientLife){
    const sx = a.x - camX;
    const sy = a.y - camY;
    if(sx < -40 || sx > CFG.VIEW_W+40 || sy < -40 || sy > CFG.VIEW_H+40) continue;

    if(a.type === 'seagull'){
      const fade = Math.min(1, a.life);
      CTX.globalAlpha = fade * 0.75;
      CTX.strokeStyle = '#e8e0f0';
      CTX.lineWidth = 1.5;
      CTX.lineCap = 'round';
      // Simple M-shape wing flap
      const flap = a.flapFrame===0 ? -3 : 2;
      CTX.beginPath();
      CTX.moveTo(sx-8, sy+flap);
      CTX.quadraticCurveTo(sx-4, sy+flap-4, sx, sy);
      CTX.quadraticCurveTo(sx+4, sy+flap-4, sx+8, sy+flap);
      CTX.stroke();
      CTX.globalAlpha = 1;
    }

    if(a.type === 'firefly'){
      const glow = 0.4 + Math.sin(a.glowTimer*2.5)*0.35;
      const r = 2.5;
      CTX.globalAlpha = Math.max(0, glow);
      // Outer glow
      const grad = CTX.createRadialGradient(sx,sy,0,sx,sy,r*3);
      grad.addColorStop(0,'rgba(180,255,120,0.9)');
      grad.addColorStop(1,'rgba(180,255,120,0)');
      CTX.fillStyle = grad;
      CTX.beginPath(); CTX.arc(sx,sy,r*3,0,Math.PI*2); CTX.fill();
      // Core dot
      CTX.globalAlpha = glow * 0.9;
      CTX.fillStyle = '#d0ffaa';
      CTX.beginPath(); CTX.arc(sx,sy,r*0.8,0,Math.PI*2); CTX.fill();
      CTX.globalAlpha = 1;
    }
  }
}
