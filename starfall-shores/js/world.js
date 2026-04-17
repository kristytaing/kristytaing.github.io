// ── Ending Sequence ──────────────────────────────────────
function checkEnding(){
  if(GS.ending || GS.crystalsFound < 5) return;
  // Check if player is near star altar
  const z = ZONES.summit;
  if(GS.currentZone !== 'summit') return;
  const altarObj = z.objects.find(o=>o.type==='star_altar');
  if(!altarObj) return;
  const T = CFG.TILE;
  if(dist(GS.player.x, GS.player.y, altarObj.x*T, altarObj.y*T) < 60){
    startEnding();
  }
}

function startEnding(){
  GS.ending = true;
  GS.endingTimer = 0;
  GS.endingPhase = 0;
  GS.endingNPCIdx = 0;
  GS.endingNPCTimer = 0;
  playSound('ending');
  saveGame();
}

const ENDING_NPC_LINES = [
  { name:'Barnaby', icon:'👴', color:'#7898B8', portrait:'🏮',
    line:'The lighthouse... it blazes like a second sun. After all these years. Thank you, young one.' },
  { name:'Coral',   icon:'🐚', color:'#78C8A0', portrait:'🌊',
    line:'Look! The coral is blooming! And there are fish — so many fish! The sea is alive again!' },
  { name:'Pip',     icon:'🌿', color:'#C8A068', portrait:'🧭',
    line:'I can smell the starfruit pies from here! The trees are blooming! This calls for a celebration!' },
  { name:'Luna',    icon:'🔭', color:'#9878B8', portrait:'✨',
    line:"...The forest spirits are singing. A song I thought was lost forever. You've done something extraordinary." },
  { name:'Fern',    icon:'⛏️',  color:'#68A088', portrait:'💎',
    line:"The caves are glowing like a festival! Every crystal is resonating. I've mapped these tunnels for years — I've never seen anything like this." },
];

function updateEnding(dt){
  if(!GS.ending) return;
  GS.endingTimer += dt;
  // Phase 0: bright flash (0-1.5s)
  // Phase 1: world restoration (1.5-4s)
  // Phase 2: NPC portrait sequence (4s + 3.5s per NPC)
  // Phase 3: final message + stats
  if(GS.endingTimer > 1500 && GS.endingPhase === 0) GS.endingPhase = 1;
  if(GS.endingTimer > 4000 && GS.endingPhase === 1) GS.endingPhase = 2;
  if(GS.endingPhase === 2){
    GS.endingNPCTimer += dt;
    if(GS.endingNPCTimer > 3500){
      GS.endingNPCTimer = 0;
      GS.endingNPCIdx++;
      if(GS.endingNPCIdx >= ENDING_NPC_LINES.length) GS.endingPhase = 3;
    }
  }
}

function renderEnding(){
  if(!GS.ending) return;
  const t = GS.endingTimer;
  const W = CFG.VIEW_W, H = CFG.VIEW_H;

  // Phase 0: white flash
  if(GS.endingPhase === 0){
    const flash = Math.min(1, t/1000);
    CTX.globalAlpha = flash;
    CTX.fillStyle = '#fff8f0';
    CTX.fillRect(0,0,W,H);
    CTX.globalAlpha = 1;
    return;
  }

  // All phases 1+: gradient sky background
  const grad = CTX.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#3D2B5E'); grad.addColorStop(0.4,'#8A5898');
  grad.addColorStop(0.7,'#D48FA0'); grad.addColorStop(1,'#F2C46D');
  CTX.fillStyle = grad; CTX.fillRect(0,0,W,H);

  // Stars
  for(let i=0;i<60;i++){
    const sx=(i*173.3)%W, sy=(i*97.7)%(H*0.6);
    const sa=0.4+Math.sin(t*0.002+i)*0.3;
    CTX.globalAlpha=sa; CTX.fillStyle='#F5EAD5';
    CTX.beginPath(); CTX.arc(sx,sy,0.8+i%2*0.5,0,Math.PI*2); CTX.fill();
  }
  CTX.globalAlpha=1;

  // Rising particles
  for(let i=0;i<30;i++){
    const px=(i*113+97)%W;
    const py=H-((t*0.035+i*22)%H);
    const pa=0.25+Math.sin(t*0.003+i)*0.15;
    CTX.globalAlpha=Math.max(0,pa);
    CTX.fillStyle=['#F2C46D','#BBA8D9','#D48FA0','#A8C890'][i%4];
    CTX.beginPath(); CTX.arc(px,py,2+i%3,0,Math.PI*2); CTX.fill();
  }
  CTX.globalAlpha=1;

  CTX.textAlign='center';
  CTX.textBaseline='middle';

  // Phase 1: restoration title
  if(GS.endingPhase === 1){
    const alpha = Math.min(1,(t-1500)/800);
    CTX.globalAlpha=alpha;
    CTX.font=`bold ${Math.round(W*0.045)}px serif`;
    CTX.fillStyle='#F2C46D';
    CTX.shadowColor='rgba(242,196,109,0.5)'; CTX.shadowBlur=20;
    CTX.fillText('✦ The Star Anchor is Restored ✦', W/2, H*0.38);
    CTX.shadowBlur=0;
    CTX.font=`${Math.round(W*0.022)}px sans-serif`;
    CTX.fillStyle='#F5EAD5';
    CTX.fillText('The island glows with renewed starlight...', W/2, H*0.48);
    CTX.fillText('The crystals sing in harmony once more.', W/2, H*0.54);
    CTX.globalAlpha=1;
  }

  // Phase 2: NPC portrait cards
  if(GS.endingPhase === 2){
    const idx = Math.min(GS.endingNPCIdx, ENDING_NPC_LINES.length-1);
    const npc = ENDING_NPC_LINES[idx];
    const cardW=Math.min(520,W*0.86), cardH=140;
    const cx=W/2, cy=H*0.5;
    const elapsed = GS.endingNPCTimer;
    const fadeIn = Math.min(1, elapsed/400);
    const fadeOut = idx < ENDING_NPC_LINES.length-1 ? Math.max(0,1-(elapsed-3000)/300) : 1;
    const alpha = fadeIn * fadeOut;

    CTX.globalAlpha=alpha;
    // Card background
    CTX.fillStyle='rgba(245,234,213,0.92)';
    roundRect(CTX,cx-cardW/2,cy-cardH/2,cardW,cardH,18);
    CTX.fill();
    CTX.strokeStyle=npc.color; CTX.lineWidth=2;
    roundRect(CTX,cx-cardW/2,cy-cardH/2,cardW,cardH,18);
    CTX.stroke();
    // Portrait circle
    CTX.fillStyle=npc.color+'33';
    CTX.beginPath(); CTX.arc(cx-cardW/2+60,cy,40,0,Math.PI*2); CTX.fill();
    CTX.fillStyle=npc.color;
    CTX.beginPath(); CTX.arc(cx-cardW/2+60,cy,40,0,Math.PI*2); CTX.stroke();
    CTX.font='36px serif'; CTX.fillStyle='#3D2B5E';
    CTX.fillText(npc.portrait, cx-cardW/2+60, cy);
    // Name
    CTX.font=`bold 14px sans-serif`; CTX.fillStyle=npc.color;
    CTX.textAlign='left';
    CTX.fillText(npc.name, cx-cardW/2+112, cy-28);
    // Dialogue text (word-wrapped)
    CTX.font='13px sans-serif'; CTX.fillStyle='#3D2B5E';
    const words=npc.line.split(' '); let line2=''; let lineY=cy-8;
    words.forEach(word=>{
      const test=line2+word+' ';
      if(CTX.measureText(test).width>cardW-140 && line2){
        CTX.fillText(line2.trim(),cx-cardW/2+112,lineY); line2=word+' '; lineY+=19;
      } else line2=test;
    });
    if(line2) CTX.fillText(line2.trim(),cx-cardW/2+112,lineY);
    // NPC progress dots
    CTX.textAlign='center';
    ENDING_NPC_LINES.forEach((_,i)=>{
      const dx=W/2+(i-2)*20, dy=cy+cardH/2+22;
      CTX.fillStyle=i<=idx?npc.color:'rgba(200,180,220,0.3)';
      CTX.beginPath(); CTX.arc(dx,dy,5,0,Math.PI*2); CTX.fill();
    });
    CTX.globalAlpha=1;

    // Hint to continue
    if(elapsed>2000){
      const ha=0.4+Math.sin(t*0.005)*0.3;
      CTX.globalAlpha=ha; CTX.font='11px sans-serif'; CTX.fillStyle='#9a88b0';
      CTX.fillText('(continuing automatically...)',W/2,cy+cardH/2+46);
      CTX.globalAlpha=1;
    }
  }

  // Phase 3: Final credits + stats
  if(GS.endingPhase === 3){
    const elapsed3=t-4000-ENDING_NPC_LINES.length*3500;
    CTX.font=`bold ${Math.round(W*0.042)}px serif`;
    CTX.fillStyle='#F2C46D';
    CTX.shadowColor='rgba(242,196,109,0.4)'; CTX.shadowBlur=16;
    const ta=Math.min(1,elapsed3/600);
    CTX.globalAlpha=ta;
    CTX.fillText('✿ The End ✿', W/2, H*0.32);
    CTX.shadowBlur=0;
    const lines=[
      'Starfall Shores',
      'A Whimsical Island Adventure',
      '',
      `⏱ Play time: ${Math.round((GS.totalPlayTime||0)/60)} minutes`,
      `💎 Crystals found: 5 / 5`,
      '',
      'Thank you for playing!'
    ];
    CTX.font=`14px sans-serif`; CTX.fillStyle='#F5EAD5';
    lines.forEach((line,i)=>{
      const la=Math.min(1,Math.max(0,(elapsed3-400-i*200)/400));
      CTX.globalAlpha=la;
      CTX.fillText(line, W/2, H*0.44+i*26);
    });
    CTX.globalAlpha=1;
  }

  CTX.textAlign='left'; CTX.textBaseline='alphabetic';
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ── Part 10: Game Loop & Init ────────────────────────────
let lastTime = 0;
function gameLoop(timestamp){
  try{
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  GS.time = timestamp;
  if(GS.state === 'playing'){
    // Update
    if(!GS.dialogue.active && !GS.ending){
      updatePlayer(dt);
    }
    updateCamera();
    updateTransition(dt);
    updateDialogue(dt);
    updateParticles(dt);
    updateNotifications(dt);
    updateEnding(dt);
    checkEnding();
    // NPC idle wander
    updateNPCWander(dt);
    updateAmbientLife(dt);
    if(typeof updateSystems === 'function') updateSystems(dt);
    if(typeof updateTutorial === 'function') updateTutorial(dt);
    // Render
    renderWorld();
    // Sort and render objects, items, NPCs, player by Y
    const z = ZONES[GS.currentZone];
    if(z){
      const cam = GS.camera;
      const renderables = [];
      // Objects
      z.objects.forEach(obj=>{
        renderables.push({y:obj.y*(obj.h||1)*CFG.TILE, type:'obj', data:obj});
      });
      // Items
      z.items.forEach(item=>{
        if(!item.taken) renderables.push({y:item.y, type:'item', data:item});
      });
      // NPCs
      z.npcs.forEach(npc=>{
        renderables.push({y:npc.y+32, type:'npc', data:npc});
      });
      // Player
      renderables.push({y:GS.player.y+32, type:'player'});
      // Sort by Y
      renderables.sort((a,b)=>a.y-b.y);
      // Render
      renderables.forEach(r=>{
        switch(r.type){
          case 'obj': renderObject(r.data, cam.x, cam.y); break;
          case 'item': renderItem(r.data, cam.x, cam.y); break;
          case 'npc': renderNPC(r.data, cam.x, cam.y); break;
          case 'player': renderPlayer(cam.x, cam.y); break;
        }
      });
    }
    renderParticles(GS.camera.x, GS.camera.y);
    renderAmbientLife(GS.camera.x, GS.camera.y);
    if(typeof renderSystems === 'function') renderSystems(GS.camera.x, GS.camera.y);

  // ── Summit altitude: wind-swept snow particles + edge fog ──
  if(GS.currentZone==='summit'){
    const snowCount = 38;
    for(let i=0;i<snowCount;i++){
      const t = GS.time*0.00035;
      const sx2 = ((i*137.5 + t*60 + Math.sin(i*0.7)*40) % (CVS.width+20)) - 10;
      const sy2 = ((i*73.1 + t*25 + Math.cos(i*0.4)*20) % (CVS.height+10));
      const drift = Math.sin(t*1.2 + i*0.9)*8;
      const alpha = 0.4 + Math.sin(t*2+i)*0.25;
      const sr = 1 + (i%3)*0.5;
      CTX.globalAlpha = Math.max(0,alpha);
      CTX.fillStyle = '#E8EAF8';
      CTX.beginPath(); CTX.arc(sx2+drift, sy2, sr, 0, Math.PI*2); CTX.fill();
    }
    CTX.globalAlpha=1;
    const fogV = CTX.createRadialGradient(CVS.width/2,CVS.height/2,CVS.height*0.28,CVS.width/2,CVS.height/2,CVS.height*0.75);
    fogV.addColorStop(0,'rgba(180,170,210,0)');
    fogV.addColorStop(1,'rgba(180,170,210,0.22)');
    CTX.fillStyle=fogV; CTX.fillRect(0,0,CVS.width,CVS.height);
  }
    renderPostProcessing();
    renderHUD();
    renderMinimap();
    renderNotifications();
    if(typeof renderTutorialHint === 'function') renderTutorialHint();
    // Transition overlay
    if(GS.transitioning){
      CTX.globalAlpha = GS.transitionAlpha;
      CTX.fillStyle = '#f5e6f0';
      CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
      CTX.globalAlpha = 1;
    }
    // Ending overlay
    renderEnding();
    // Screen flash
    if(GS.screenFlash > 0){
      CTX.globalAlpha = GS.screenFlash;
      CTX.fillStyle = '#fff8f0';
      CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
      CTX.globalAlpha = 1;
      GS.screenFlash *= 0.92;
      if(GS.screenFlash < 0.01) GS.screenFlash = 0;
    }
  }
  requestAnimationFrame(gameLoop);
  }catch(e){
    console.error('GAMELOOP ERROR:', e.message, e.stack);
    // Show error on screen
    const el = document.getElementById('game-error');
    if(el){ el.textContent = 'Error: '+e.message; el.style.display='block'; }
    requestAnimationFrame(gameLoop);
  }
}

function updateNPCWander(dt){
  const z = ZONES[GS.currentZone];
  if(!z) return;
  for(const npc of z.npcs){
    npc.walkTimer = (npc.walkTimer||0) + dt;
    if(!npc.wanderTarget && Math.random() < 0.005){
      // Pick a nearby wander target
      const data = NPC_DATA[npc.id];
      if(!data) continue;
      const baseX = data.x * CFG.TILE;
      const baseY = data.y * CFG.TILE;
      npc.wanderTarget = {
        x: baseX + (Math.random()-0.5)*60,
        y: baseY + (Math.random()-0.5)*60
      };
    }
    if(npc.wanderTarget){
      const dx = npc.wanderTarget.x - npc.x;
      const dy = npc.wanderTarget.y - npc.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if(d < 3){
        npc.wanderTarget = null;
        npc.walking = false;
      } else {
        npc.walking = true;
        npc.walkFrame += dt*5;
        const speed = 25 * dt;
        npc.x += (dx/d)*speed;
        npc.y += (dy/d)*speed;
        if(Math.abs(dx)>Math.abs(dy)){
          npc.dir = dx<0?1:3;
        } else {
          npc.dir = dy<0?2:0;
        }
      }
    }
  }
}
