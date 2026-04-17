// ── Part 5: NPC System ───────────────────────────────────
const NPC_DATA = {
  barnaby: {
    name: 'Barnaby', zone: 'beach', x: 14, y: 8,
    skin:'#E8C8A0', hair:'#D0D0D0', hairStyle:0, outfit:'#7898B8',
    greeting: "Ahoy there, young one! I'm Barnaby, the old lighthouse keeper.",
    dialogues: [
      {text:"The Starfall Crystals... they fell from the sky when the Star Anchor shattered. Five pieces, scattered across the island.", quest:'main'},
      {text:"The lighthouse needs a Beacon Shard to function. I think one washed up in the tide pools to the south. Could you find it?", quest:'barnaby_beacon', need:'Beacon Shard'},
      {text:"You found the Beacon Shard! Bless you! Here — take this old Lantern. It'll light your way in the dark caves.", reward:'Cave Lantern', quest:'barnaby_beacon'},
      {text:"The beach crystal washed ashore near the tide pools. Be careful of the waves!", hint:'beach'},
      {text:"You remind me of the old adventurers who used to visit. They had that same spark in their eyes.", idle:true},
      {text:"The lighthouse hasn't shone properly since the Star Anchor broke. The whole island feels dimmer.", idle:true}
    ],
    dynamicDialogue() {
      const n = GS.crystalsFound || 0;
      if (n >= 5) return "You did it! The Star Anchor is restored! Last night the lighthouse blazed like I've never seen!";
      if (n >= 4) return "Only one more crystal! I swear the lighthouse flame grows stronger each time you find one.";
      if (n >= 3) return "Three crystals! The island is waking up — the tide pools are glowing again at night.";
      if (n >= 2) return "Two already! I saw a shooting star last night for the first time in months. Keep going!";
      if (n >= 1) return "The lighthouse flickered on last night! Just a moment, but it's a start. Whatever you're doing — keep it up.";
      return null;
    }
  },
  coral: {
    name: 'Coral', zone: 'beach', x: 22, y: 14,
    skin:'#D8B898', hair:'#C87850', hairStyle:1, outfit:'#78C8A0',
    greeting: "Oh! You must be new here! I'm Coral! I collect shells and pretty things!",
    dialogues: [
      {text:"I found this amazing shell but I lost my Shell Necklace somewhere in the village! Can you find it?", quest:'coral_necklace', need:'Shell Necklace'},
      {text:"You found it!! Here, take this Coral Charm as thanks! It might help in the caves.", reward:'Coral Charm', quest:'coral_necklace'},
      {text:"The tide pools are my favorite spot. You can find all sorts of treasures there!", idle:true},
      {text:"Sometimes at night, I see the crystals glowing under the water. So pretty!", idle:true}
    ],
    dynamicDialogue() {
      const n = GS.crystalsFound || 0;
      if (n >= 3) return "The coral is coming back! Look — there are little fish in the tide pools again!";
      if (GS.inventory && GS.inventory.some(i => i.name === 'Coral Charm'))
        return "That Coral Charm I gave you... it lets you walk in the shallows without being pushed back. Pretty useful, right?";
      return null;
    }
  },
  pip: {
    name: 'Pip', zone: 'village', x: 15, y: 8,
    skin:'#F0D0B0', hair:'#5C8848', hairStyle:0, outfit:'#C8A068',
    greeting: "Heya! I'm Pip! I know every shortcut on this island!",
    dialogues: [
      {text:"The forest is super tricky to navigate. I can tell you the safe paths if you bring me a Forest Map!", quest:'pip_map', need:'Forest Map'},
      {text:"Nice, a Forest Map! Okay, the trick is to follow the mushroom trail. Here's my Lucky Compass!", reward:'Lucky Compass', quest:'pip_map'},
      {text:"Did you know there's a hidden cave behind the waterfall? I've never been brave enough to go in though.", idle:true},
      {text:"The village baker makes the best starfruit pies. Too bad the starfruit trees stopped blooming.", idle:true}
    ],
    dynamicDialogue() {
      const n = GS.crystalsFound || 0;
      const hasCompass = GS.inventory && GS.inventory.some(i => i.name === 'Lucky Compass');
      if (n >= 5) return "You actually did it! The starfruit trees are blooming again — I can smell the pies already!";
      if (hasCompass) return "That Lucky Compass points to the nearest crystal when you open the minimap. Handy, right?";
      if (n >= 2) return "Two crystals already? You're faster than I expected. The forest path gets clearer the more crystals are found.";
      return null;
    }
  },
  luna: {
    name: 'Luna', zone: 'forest', x: 10, y: 20,
    skin:'#E0C8B8', hair:'#483868', hairStyle:1, outfit:'#9878B8',
    greeting: "...oh. Hello. I'm Luna. I study the old magic of the island.",
    dialogues: [
      {text:"The caves hold ancient inscriptions. I need a Crystal Lens to read them. Have you seen one?", quest:'luna_lens', need:'Crystal Lens'},
      {text:"The Crystal Lens! Now I can decipher the cave writings. Take this Shadow Cloak—it will protect you.", reward:'Shadow Cloak', quest:'luna_lens'},
      {text:"The forest spirits are restless since the Star Anchor broke. Can you feel it?", idle:true},
      {text:"My research suggests the Star Anchor was created by an ancient civilization that lived on the summit.", idle:true}
    ],
    dynamicDialogue() {
      const n = GS.crystalsFound || 0;
      if (n >= 5) return "The forest spirits are at peace. I can hear them singing again — a song I haven't heard since childhood.";
      if (n >= 3) return "Three crystals... the old inscriptions mention this exact moment. 'When three stars return, the island remembers.' I think it's working.";
      if (GS.inventory && GS.inventory.some(i => i.name === 'Shadow Cloak'))
        return "The Shadow Cloak will make the cave guardians ignore you. The inscriptions called them 'Echoes of the Anchor.'";
      return null;
    }
  },
  fern: {
    name: 'Fern', zone: 'caves', x: 10, y: 6,
    skin:'#C8B898', hair:'#A07848', hairStyle:0, outfit:'#68A088',
    greeting: "Well well! Another explorer! I'm Fern, spelunker extraordinaire!",
    dialogues: [
      {text:"The deeper caves are blocked by crystal formations. My pick broke! Got a Sturdy Pickaxe?", quest:'fern_pick', need:'Sturdy Pickaxe'},
      {text:"A Pickaxe! Brilliant! I cleared the path. Take these Cave Crystals for your trouble!", reward:'Cave Crystals', quest:'fern_pick'},
      {text:"These caves are millions of years old. The crystal formations are natural, but the Star Anchor enhanced them.", idle:true},
      {text:"I've mapped most of these tunnels, but there's always a new passage to discover!", idle:true}
    ],
    dynamicDialogue() {
      const n = GS.crystalsFound || 0;
      const hasLantern = GS.inventory && GS.inventory.some(i => i.name === 'Cave Lantern');
      if (n >= 5) return "The caves are lit up like a festival! Every crystal formation is resonating. I've never seen anything like it!";
      if (!hasLantern) return "Hey — it gets very dark deeper in. Make sure you have the Cave Lantern before you go further!";
      if (n >= 2) return "Good progress! The crystals deeper in will be harder to reach. The Shadow Cloak might help you slip past the tricky spots.";
      return null;
    }
  }
};

function initNPCs(){
  Object.keys(NPC_DATA).forEach(id=>{
    const npc = NPC_DATA[id];
    const z = ZONES[npc.zone];
    if(z){
      z.npcs.push({
        id, x: npc.x*CFG.TILE, y: npc.y*CFG.TILE,
        name: npc.name, dir: 0, walkFrame: 0, walkTimer: 0,
        walking: false, path: null
      });
    }
  });
}

function renderNPC(npc, camX, camY){
  const data = NPC_DATA[npc.id];
  if(!data) return;
  const x = npc.x - camX;
  const y = npc.y - camY;
  const bob = npc.walking ? Math.sin(npc.walkFrame*0.3)*1.5 : 0;
  const dir = npc.dir || 0;
  const skin = data.skin || '#F2C9A0';
  const hair = data.hair || '#5a4030';
  const shirt = data.outfit || '#D48FA0';
  const pants = data.pants || '#3D2B5E';
  const shoe = '#5a3a28';
  const as2 = npc.walking ? Math.sin(npc.walkFrame*0.3)*3 : 0;
  const ls = npc.walking ? Math.sin(npc.walkFrame*0.3)*4 : 0;

  CTX.save();
  CTX.translate(x+16, y+30+bob);

  // Shadow
  CTX.fillStyle = 'rgba(0,0,0,0.09)';
  CTX.beginPath(); CTX.ellipse(0,2,9,3,0,0,Math.PI*2); CTX.fill();

  // Legs
  CTX.fillStyle = pants;
  CTX.beginPath(); CTX.roundRect(-6,-4,5,10,2); CTX.fill();
  CTX.beginPath(); CTX.roundRect(1,-4,5,10,2); CTX.fill();
  // Shoes
  CTX.fillStyle = shoe;
  CTX.beginPath(); CTX.ellipse(-3.5+ls*0.3,7,4.5,2.5,0,0,Math.PI*2); CTX.fill();
  CTX.beginPath(); CTX.ellipse(3.5-ls*0.3,7,4.5,2.5,0,0,Math.PI*2); CTX.fill();

  // Body
  CTX.fillStyle = shirt;
  CTX.beginPath(); CTX.roundRect(-8,-14,16,12,3); CTX.fill();

  // Arms
  CTX.fillStyle = shirt;
  CTX.beginPath(); CTX.roundRect(-13,-13+as2*0.3,6,9,3); CTX.fill();
  CTX.beginPath(); CTX.roundRect(7,-13-as2*0.3,6,9,3); CTX.fill();
  CTX.fillStyle = skin;
  CTX.beginPath(); CTX.arc(-10,-3+as2*0.3,3,0,Math.PI*2); CTX.fill();
  CTX.beginPath(); CTX.arc(10,-3-as2*0.3,3,0,Math.PI*2); CTX.fill();

  // Neck
  CTX.fillStyle = skin;
  CTX.beginPath(); CTX.roundRect(-3,-18,6,6,2); CTX.fill();

  // Back hair
  CTX.fillStyle = hair;
  CTX.beginPath(); CTX.ellipse(0,-26,11,9,0,0,Math.PI*2); CTX.fill();
  CTX.beginPath();
  CTX.moveTo(-10,-26); CTX.quadraticCurveTo(-13,-20,-11,-14); CTX.lineTo(-8,-14); CTX.quadraticCurveTo(-9,-20,-7,-26); CTX.closePath(); CTX.fill();
  CTX.beginPath();
  CTX.moveTo(10,-26); CTX.quadraticCurveTo(13,-20,11,-14); CTX.lineTo(8,-14); CTX.quadraticCurveTo(9,-20,7,-26); CTX.closePath(); CTX.fill();

  // Head
  CTX.fillStyle = skin;
  CTX.beginPath(); CTX.ellipse(0,-26,10,10,0,0,Math.PI*2); CTX.fill();

  // Face
  if(dir !== 2){
    const faceDir = dir===1?-1:dir===3?1:0;
    // Eyes
    [-4.5,4.5].forEach(ex=>{
      const eyeX = ex + faceDir*1.2;
      const eyeY = -27;
      CTX.fillStyle='#fff'; CTX.beginPath(); CTX.ellipse(eyeX,eyeY,2.8,2.8,0,0,Math.PI*2); CTX.fill();
      CTX.fillStyle='#5060a0'; CTX.beginPath(); CTX.ellipse(eyeX+faceDir*0.5,eyeY,1.8,1.8,0,0,Math.PI*2); CTX.fill();
      CTX.fillStyle='#1a1828'; CTX.beginPath(); CTX.ellipse(eyeX+faceDir*0.5,eyeY,1,1,0,0,Math.PI*2); CTX.fill();
      CTX.fillStyle='rgba(255,255,255,0.9)'; CTX.beginPath(); CTX.arc(eyeX+faceDir*0.3+0.8,eyeY-0.8,0.8,0,Math.PI*2); CTX.fill();
    });
    // Blush
    CTX.fillStyle='rgba(220,140,140,0.18)';
    CTX.beginPath(); CTX.ellipse(-6+faceDir,-24,3,1.5,0,0,Math.PI*2); CTX.fill();
    CTX.beginPath(); CTX.ellipse(6+faceDir,-24,3,1.5,0,0,Math.PI*2); CTX.fill();
    // Mouth
    CTX.strokeStyle='rgba(160,90,90,0.7)'; CTX.lineWidth=1.2; CTX.lineCap='round';
    CTX.beginPath(); CTX.arc(faceDir,-22,2.5,0.2,Math.PI-0.2); CTX.stroke();
  }

  // Hair top
  CTX.fillStyle = hair;
  CTX.beginPath(); CTX.ellipse(0,-33,10,5,0,Math.PI,0); CTX.fill();
  CTX.beginPath();
  CTX.moveTo(-9,-31); CTX.quadraticCurveTo(-5,-27,0,-27); CTX.quadraticCurveTo(5,-27,9,-31);
  CTX.closePath(); CTX.fill();

  // Name tag
  if(GS.player.nearNPC===npc.id){
    CTX.fillStyle='rgba(245,234,213,0.92)';
    const tw = CTX.measureText(data.name).width+14;
    CTX.beginPath(); CTX.roundRect(-tw/2,-50,tw,18,6); CTX.fill();
    CTX.fillStyle='#3D2B5E'; CTX.font='bold 11px sans-serif'; CTX.textAlign='center';
    CTX.fillText(data.name,0,-37);
  }

  CTX.restore();
}

function isSolid(zone, tx, ty){
  const z = ZONES[zone];
  if(!z) return true;
  if(tx<0||ty<0||tx>=z.w||ty>=z.h) return true;
  const tid = z.tiles[ty]?z.tiles[ty][tx]:0;
  if(tid===1 && GS.coralCharmActive) return false; // coral charm allows shallow water
  return tid===1; // only water/ocean tiles block movement
}

function checkCollision(px, py, zone){
  const T = CFG.TILE;
  const margin = 6;
  const left = Math.floor((px+margin)/T);
  const right = Math.floor((px+32-margin)/T);
  const top = Math.floor((py+16)/T);
  const bottom = Math.floor((py+32-2)/T);
  if(isSolid(zone,left,top)||isSolid(zone,right,top)||isSolid(zone,left,bottom)||isSolid(zone,right,bottom)) return true;
  // Object collision
  const z = ZONES[zone];
  if(z){
    // Only visually large/solid objects block — decorative items never block
    const SOLID_TYPES = new Set(['palm_tree','palm','house','tree_village','ancient_tree','rock_lg','fountain','crystal_big','lighthouse']);
    for(const obj of z.objects){
      if(!SOLID_TYPES.has(obj.type)) continue;
      const ox = obj.x*T, oy = obj.y*T, ow = (obj.w||1)*T, oh = (obj.h||1)*T;
      // Only block the bottom 1 tile (foot) of the object
      const footTop = oy + oh - T;
      const footBot = oy + oh + 4;
      // Leave a door gap at the horizontal center of house objects
      const hasDoorGap = obj.type==='house';
      const doorLeft = ox + ow*0.38 - 4;
      const doorRight = ox + ow*0.62 + 4;
      const inDoorGap = hasDoorGap && px+margin < doorRight && px+32-margin > doorLeft;
      if(!inDoorGap && px+32-margin>ox+4 && px+margin<ox+ow-4 && py+32>footTop && py+24<footBot){
        return true;
      }
    }
  }
  return false;
}

function updatePlayer(dt){
  const p = GS.player;
  const speed = CFG.PLAYER_SPEED * (GS.speedMult || 1.0) * dt;
  let dx=0, dy=0;
  if(INPUT.keys['ArrowUp']||INPUT.keys['KeyW']||INPUT.keys['w']||INPUT.keys['W']) dy=-1;
  if(INPUT.keys['ArrowDown']||INPUT.keys['KeyS']||INPUT.keys['s']||INPUT.keys['S']) dy=1;
  if(INPUT.keys['ArrowLeft']||INPUT.keys['KeyA']||INPUT.keys['a']||INPUT.keys['A']) dx=-1;
  if(INPUT.keys['ArrowRight']||INPUT.keys['KeyD']||INPUT.keys['d']||INPUT.keys['D']) dx=1;
  // Mobile joystick
  if(INPUT.joystick.active){
    dx = INPUT.joystick.dx;
    dy = INPUT.joystick.dy;
  }
  // Normalize
  if(dx!==0&&dy!==0){
    const len = Math.sqrt(dx*dx+dy*dy);
    dx/=len; dy/=len;
  }
  p.walking = dx!==0||dy!==0;
  if(p.walking){
    if(Math.abs(dx)>Math.abs(dy)){
      p.dir = dx<0?1:3;
    } else {
      p.dir = dy<0?2:0;
    }
    p.walkTimer += dt;
    p.walkFrame = p.walkTimer*8;
    // Try move
    const nx = p.x + dx*speed;
    const ny = p.y + dy*speed;
    if(!checkCollision(nx, p.y, GS.currentZone)) p.x = nx;
    if(!checkCollision(p.x, ny, GS.currentZone)) p.y = ny;
    // Footstep sounds
    if(Math.floor(p.walkFrame)%8===0 && Math.floor(p.walkFrame) !== Math.floor((p.walkTimer-dt)*8)%8){
      playSound('step');
    }
  } else {
    p.walkTimer = 0;
  }
  // Zone transitions
  checkZoneTransition();
  // NPC proximity
  checkNPCProximity();
  // Item proximity
  checkItemProximity();
}

function checkZoneTransition(){
  const p = GS.player;
  const T = CFG.TILE;
  const z = ZONES[GS.currentZone];
  if(!z || GS.transitioning) return;
  const ptx = Math.floor((p.x+16)/T);
  const pty = Math.floor((p.y+24)/T);
  for(const t of z.transitions){
    if(ptx>=t.x && ptx<t.x+t.w && pty>=t.y && pty<t.y+t.h){
      startTransition(t.to, t.toX, t.toY);
      break;
    }
  }
}

function startTransition(zone, tx, ty){
  GS.transitioning = true;
  GS.transitionAlpha = 0;
  GS.transitionTarget = {zone, x:tx, y:ty};
  GS.transitionPhase = 'out';
  playSound('zone');
  // Auto-save on every zone transition
  saveGame();
}

function updateTransition(dt){
  if(!GS.transitioning) return;
  const speed = 2 * dt;
  if(GS.transitionPhase === 'out'){
    GS.transitionAlpha = Math.min(1, GS.transitionAlpha + speed);
    if(GS.transitionAlpha >= 1){
      // Switch zone
      const t = GS.transitionTarget;
      GS.currentZone = t.zone;
      GS.player.x = t.x;
      GS.player.y = t.y;
      GS.camera.x = t.x - CFG.VIEW_W/2;
      GS.camera.y = t.y - CFG.VIEW_H/2;
      GS.transitionPhase = 'in';
      // Play zone-entry chime
      if(G.audioCtx && G.soundOn){
        const ZONE_CHIMES = {
          beach:[523,659],village:[587,740],forest:[466,587],
          caves:[311,392],summit:[698,880],ruins:[415,523]
        };
        const chime = ZONE_CHIMES[t.zone]||[523,659];
        chime.forEach((n,i)=>setTimeout(()=>Audio.playNote(n,0.5,'sine',0.08,G.musicGain),i*180));
      }
      // Show zone name card using #zone-label div
      const zoneName = ZONES[t.zone]?.name || (t.zone.charAt(0).toUpperCase()+t.zone.slice(1));
      const zlEl = document.getElementById('zone-label');
      if(zlEl){
        zlEl.textContent = zoneName;
        zlEl.style.transition = 'none';
        zlEl.style.opacity = '0';
        zlEl.style.transform = 'translate(-50%,-50%) scale(0.85)';
        setTimeout(()=>{
          zlEl.style.transition = 'opacity 0.5s, transform 0.5s';
          zlEl.style.opacity = '1';
          zlEl.style.transform = 'translate(-50%,-50%) scale(1)';
          setTimeout(()=>{
            zlEl.style.transition = 'opacity 0.8s, transform 0.8s';
            zlEl.style.opacity = '0';
            zlEl.style.transform = 'translate(-50%,-50%) scale(1.08)';
          }, 1500);
        }, 100);
      }
    }
  } else {
    GS.transitionAlpha = Math.max(0, GS.transitionAlpha - speed);
    if(GS.transitionAlpha <= 0){
      GS.transitioning = false;
    }
  }
}

function updateCamera(){
  const p = GS.player;
  const z = ZONES[GS.currentZone];
  if(!z) return;
  const T = CFG.TILE;
  const targetX = p.x + 16 - CFG.VIEW_W/2;
  const targetY = p.y + 24 - CFG.VIEW_H/2;
  // Deadzone: only move camera if player moves beyond 60px from center
  const dx = targetX - GS.camera.x;
  const dy = targetY - GS.camera.y;
  const deadzone = 60;
  if(Math.abs(dx) > deadzone) GS.camera.x += (dx - Math.sign(dx)*deadzone) * 0.12;
  if(Math.abs(dy) > deadzone) GS.camera.y += (dy - Math.sign(dy)*deadzone) * 0.12;
  // Clamp
  GS.camera.x = Math.max(0, Math.min(z.w*T-CFG.VIEW_W, GS.camera.x));
  GS.camera.y = Math.max(0, Math.min(z.h*T-CFG.VIEW_H, GS.camera.y));
  // Screen shake
  if(GS.screenShake > 0){
    GS.camera.x += (Math.random()-0.5)*GS.screenShake;
    GS.camera.y += (Math.random()-0.5)*GS.screenShake;
    GS.screenShake *= 0.9;
    if(GS.screenShake < 0.5) GS.screenShake = 0;
  }
}

function checkNPCProximity(){
  const p = GS.player;
  const z = ZONES[GS.currentZone];
  if(!z) return;
  p.nearNPC = null;
  for(const npc of z.npcs){
    if(dist(p.x, p.y, npc.x, npc.y) < 50){
      p.nearNPC = npc.id;
      break;
    }
  }
}

function checkItemProximity(){
  const p = GS.player;
  const z = ZONES[GS.currentZone];
  if(!z) return;
  p.nearItem = null;
  for(const item of z.items){
    if(!item.taken && dist(p.x, p.y, item.x, item.y) < 40){
      p.nearItem = item.id;
      break;
    }
  }
}

// ── Interaction ──────────────────────────────────
function interact(){
  const p = GS.player;
  if(GS.dialogue.active){
    advanceDialogue();
    return;
  }
  if(p.nearNPC){
    startNPCDialogue(p.nearNPC);
    return;
  }
  if(p.nearItem){
    pickupItem(p.nearItem);
    return;
  }
}

function pickupItem(itemId){
  const z = ZONES[GS.currentZone];
  if(!z) return;
  const item = z.items.find(i=>i.id===itemId);
  if(!item || item.taken) return;
  item.taken = true;
  GS.inventory.push({name:item.item, icon:item.icon||'✦', crystal:item.crystal||false});
  if(item.crystal){ playSound('ending'); GS.screenShake = 8; }
  else playSound('pickup');
  showNotification('Found: ' + item.item + ' ' + (item.icon||'✦'));
  // Floating text popup
  GS.floatingTexts = GS.floatingTexts||[];
  GS.floatingTexts.push({text:(item.icon||'✦')+' +'+item.item, x:item.x, y:item.y-10, life:2, maxLife:2});
  // Particle burst
  spawnParticleBurst(item.x+16, item.y+16, item.crystal?'#d0b0f0':'#f0d8a0', item.crystal?20:12);
  // Check crystal count
  if(item.crystal){
    GS.crystalsFound = GS.inventory.filter(i=>i.crystal).length;
    if(GS.crystalsFound >= 5){
      showNotification('✦ All 5 Crystals collected! Head to the Star Altar! ✦');
    }
  }
  // Quest progress
  checkQuestProgress();
  // Update item effects and world state
  if(typeof recomputeItemEffects === 'function') recomputeItemEffects();
  if(typeof updateWorldState === 'function') updateWorldState();
}

function spawnParticleBurst(x, y, color, count){
  for(let i=0;i<count;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = 1+Math.random()*3;
    GS.particles.push({
      x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 1,
      life: 1, maxLife: 1, size: 2+Math.random()*3,
      color: color, gravity: 0.03
    });
  }
}

// ── Part 7: Dialogue System ──────────────────────────────
function startNPCDialogue(npcId){
  const data = NPC_DATA[npcId];
  if(!data) return;
  // Inject dynamic state-aware line at top of dialogue queue
  if(data.dynamicDialogue){
    const dynLine = data.dynamicDialogue();
    if(dynLine){
      GS.dialogue.active = true;
      GS.dialogue.npcId = npcId;
      GS.dialogue.lines = [dynLine];
      GS.dialogue.lineIndex = 0;
      GS.dialogue.charIndex = 0;
      GS.dialogue.timer = 0;
      GS.player.interacting = true;
      const data2 = NPC_DATA[npcId];
      const box2 = document.getElementById('dialogue-box');
      const nameEl2 = document.getElementById('dialogue-name');
      const textEl2 = document.getElementById('dialogue-text');
      box2.style.display = 'block';
      nameEl2.textContent = data2 ? data2.name : npcId;
      textEl2.textContent = '';
      playSound('talk');
      return;
    }
  }
  GS.dialogue.active = true;
  GS.dialogue.npcId = npcId;
  GS.dialogue.lines = [];
  GS.dialogue.lineIndex = 0;
  GS.dialogue.charIndex = 0;
  GS.dialogue.timer = 0;
  GS.player.interacting = true;
  // Build dialogue lines
  // First: greeting if first time
  if(!GS.dialogue.seen) GS.dialogue.seen = {};
  if(!GS.dialogue.seen[npcId]){
    GS.dialogue.lines.push(data.greeting);
    GS.dialogue.seen[npcId] = true;
  }
  // Quest-relevant dialogue
  let addedQuest = false;
  for(const d of data.dialogues){
    if(d.quest && d.need){
      // Check if player has the needed item
      const hasItem = GS.inventory.some(i=>i.name===d.need);
      const questDone = GS.quests.completed && GS.quests.completed.includes(d.quest);
      if(!questDone && !hasItem){
        GS.dialogue.lines.push(d.text);
        // Start quest if not active
        if(!GS.quests.active) GS.quests.active = [];
        if(!GS.quests.active.find(q=>q.id===d.quest)){
          GS.quests.active.push({id:d.quest, name:'Help '+data.name, desc:d.text, npc:npcId, need:d.need});
          showNotification('New Quest: Help '+data.name);
        }
        addedQuest = true;
        break;
      }
    }
    if(d.quest && d.reward){
      const hasNeed = GS.quests.active && GS.quests.active.find(q=>q.id===d.quest);
      const questDone = GS.quests.completed && GS.quests.completed.includes(d.quest);
      if(hasNeed && !questDone){
        // Check if player has the required item for this quest
        const quest = GS.quests.active.find(q=>q.id===d.quest);
        if(quest && GS.inventory.some(i=>i.name===quest.need)){
          GS.dialogue.lines.push(d.text);
          // Remove needed item, add reward
          GS.inventory = GS.inventory.filter(i=>i.name!==quest.need);
          const REWARD_ICONS = {'Coral Charm':'🐚','Lucky Compass':'🧭','Shadow Cloak':'🌑','Cave Lantern':'🏮','Forest Map':'🗺️'};
          GS.inventory.push({name:d.reward, icon:REWARD_ICONS[d.reward]||'🎁', crystal:false});
          if(!GS.quests.completed) GS.quests.completed = [];
          GS.quests.completed.push(d.quest);
          GS.quests.active = GS.quests.active.filter(q=>q.id!==d.quest);
          showNotification('Quest Complete! Got: '+d.reward+' '+(REWARD_ICONS[d.reward]||'🎁'));
          playSound('quest');
          if(typeof recomputeItemEffects === 'function') recomputeItemEffects();
          if(typeof updateWorldState === 'function') updateWorldState();
          addedQuest = true;
          break;
        }
      }
    }
  }
  // Main quest dialogue
  if(!addedQuest){
    for(const d of data.dialogues){
      if(d.quest === 'main'){
        GS.dialogue.lines.push(d.text);
        addedQuest = true;
        break;
      }
    }
  }
  // Idle dialogue
  if(!addedQuest || GS.dialogue.lines.length < 2){
    const idles = data.dialogues.filter(d=>d.idle);
    if(idles.length > 0){
      const idle = idles[Math.floor(Math.random()*idles.length)];
      GS.dialogue.lines.push(idle.text);
    }
  }
  if(GS.dialogue.lines.length === 0){
    GS.dialogue.lines.push("...");
  }
  // NPC faces the player
  const npcObj = ZONES[GS.currentZone]?.npcs.find(n=>n.id===npcId);
  if(npcObj){
    const px = GS.player.x, py = GS.player.y;
    const adx = npcObj.x - px, ady = npcObj.y - py;
    if(Math.abs(adx) > Math.abs(ady)) npcObj.dir = adx < 0 ? 3 : 1;
    else npcObj.dir = ady < 0 ? 0 : 2;
  }
  // Show dialogue box
  const box = document.getElementById('dialogue-box');
  const nameEl = document.getElementById('dialogue-name');
  const textEl = document.getElementById('dialogue-text');
  box.style.display = 'block';
  nameEl.textContent = data.name;
  textEl.textContent = '';
  playSound('talk');
}

function advanceDialogue(){
  const textEl = document.getElementById('dialogue-text');
  const currentLine = GS.dialogue.lines[GS.dialogue.lineIndex];
  if(GS.dialogue.charIndex < currentLine.length){
    // Show full line instantly
    textEl.textContent = currentLine;
    GS.dialogue.charIndex = currentLine.length;
    return;
  }
  // Next line
  GS.dialogue.lineIndex++;
  if(GS.dialogue.lineIndex >= GS.dialogue.lines.length){
    // End dialogue
    closeDialogue();
    return;
  }
  GS.dialogue.charIndex = 0;
  GS.dialogue.timer = 0;
  textEl.textContent = '';
  playSound('talk');
}

function closeDialogue(){
  GS.dialogue.active = false;
  GS.player.interacting = false;
  document.getElementById('dialogue-box').style.display = 'none';
}

function updateDialogue(dt){
  if(!GS.dialogue.active) return;
  const line = GS.dialogue.lines[GS.dialogue.lineIndex];
  if(!line) return;
  if(GS.dialogue.charIndex < line.length){
    GS.dialogue.timer += dt;
    if(GS.dialogue.timer > 0.03){
      GS.dialogue.timer = 0;
      GS.dialogue.charIndex++;
      document.getElementById('dialogue-text').textContent = line.substring(0, GS.dialogue.charIndex);
      // Typewriter sound
      if(GS.dialogue.charIndex % 3 === 0) playSound('type');
    }
  }
}
