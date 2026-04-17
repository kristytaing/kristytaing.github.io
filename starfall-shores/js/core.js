
// ═══════════════════════════════════════════════════════════════
// STARFALL SHORES — Whimsical Island Adventure
// Soft pastel palette · Hand-drawn feel · Dreamy atmosphere
// ═══════════════════════════════════════════════════════════════

// Polyfill CTX.roundRect for browsers that don't support it (Chrome<99, Firefox<112, Safari<15.4)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w/2, h/2);
    this.moveTo(x+r, y);
    this.lineTo(x+w-r, y);
    this.quadraticCurveTo(x+w, y, x+w, y+r);
    this.lineTo(x+w, y+h-r);
    this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    this.lineTo(x+r, y+h);
    this.quadraticCurveTo(x, y+h, x, y+h-r);
    this.lineTo(x, y+r);
    this.quadraticCurveTo(x, y, x+r, y);
    this.closePath();
    return this;
  };
}

const CFG = {
  TILE: 48, VIEW_W: 0, VIEW_H: 0,
  PLAYER_SPEED: 140, NPC_INTERACT_DIST: 52,
  ZONE_TRANSITION_DIST: 24, CAM_LERP: 4.0,
  DAY_LENGTH: 300, PARTICLE_MAX: 400,
  MOBILE: navigator.maxTouchPoints > 0 || window.innerWidth < 768
};

const G = {
  state: 'title', time: 0, dayTime: 0.35, dt: 0,
  currentZone: 'beach',
  player: {
    x: 400, y: 400, vx: 0, vy: 0,
    dir: 0, walking: false, walkFrame: 0, walkTimer: 0,
    name: 'Lily', hp: 3, maxHp: 3, coins: 0,
    skin: '#F5DEB3', hair: '#8B5E3C', hairStyle: 1, outfit: '#7BA7CC',
    interacting: false, nearNPC: null, nearItem: null
  },
  camera: { x: 0, y: 0, targetX: 0, targetY: 0, shake: 0 },
  inventory: [], quests: [], npcs: [], particles: [],
  dialogueState: null, flags: {},
  soundOn: true, audioCtx: null, masterGain: null, musicGain: null, sfxGain: null,
  zoneFadeAlpha: 0, zoneLabel: '', zoneLabelTimer: 0,
  crystalsCollected: 0, totalPlayTime: 0, screenFlash: 0
};

// ============ CANVAS ============
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');


// ============ INPUT ============
const keys = {}, keysJustPressed = {}, prevKeys = {};
function updateInput() { for (const k in keys) { keysJustPressed[k] = keys[k] && !prevKeys[k]; prevKeys[k] = keys[k]; } }
function justPressed(code) { return keysJustPressed[code]; }

// ============ UTILS ============
function lerp(a,b,t){return a+(b-a)*Math.min(1,t)}
function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v))}
function dist(x1,y1,x2,y2){return Math.sqrt((x2-x1)**2+(y2-y1)**2)}
function rng(a,b){return Math.random()*(b-a)+a}
function rngInt(a,b){return Math.floor(rng(a,b+1))}
function rgba(r,g,b,a){return`rgba(${r},${g},${b},${a})`}
function hsl(h,s,l){return`hsl(${h},${s}%,${l}%)`}
function tileHash(x,y,s){const n=Math.sin(x*374.761+y*668.265+(s||0)*127.1)*43758.5453;return n-Math.floor(n)}
function colorShift(hex,amt){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return`rgb(${clamp(r+amt,0,255)},${clamp(g+amt,0,255)},${clamp(b+amt,0,255)})`
}
function drawStarSimple(ctx,x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<5;i++){const a=-Math.PI/2+(Math.PI*2/5)*i;
    ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
    ctx.lineTo(x+Math.cos(a+Math.PI/5)*r*0.4,y+Math.sin(a+Math.PI/5)*r*0.4);
  }ctx.closePath();ctx.fill();
}

// ============ AUDIO ============
const Audio = {
  init(){
    if(G.audioCtx)return;
    G.audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    G.masterGain=G.audioCtx.createGain();G.masterGain.connect(G.audioCtx.destination);G.masterGain.gain.value=0.5;
    G.musicGain=G.audioCtx.createGain();G.musicGain.connect(G.masterGain);G.musicGain.gain.value=0.3;
    G.sfxGain=G.audioCtx.createGain();G.sfxGain.connect(G.masterGain);G.sfxGain.gain.value=0.5;
    this.startAmbience();
  },
  playNote(freq,dur,type='sine',gain=0.15,dest=null){
    if(!G.audioCtx||!G.soundOn)return;const ac=G.audioCtx,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.connect(g);g.connect(dest||G.sfxGain);o.start();o.stop(ac.currentTime+dur);
  },
  playChime(f=523,c=3){for(let i=0;i<c;i++)setTimeout(()=>this.playNote(f*(1+i*0.25),0.4,'sine',0.1),i*120)},
  playPickup(){[523,659,784].forEach((n,i)=>setTimeout(()=>this.playNote(n,0.2,'sine',0.12),i*80))},
  playInteract(){this.playNote(440,0.15,'triangle',0.1)},
  playStep(){this.playNote(rng(80,120),0.08,'triangle',0.03)},
  playMenuClick(){this.playNote(660,0.1,'sine',0.08)},
  playQuestComplete(){[523,659,784,1047].forEach((n,i)=>setTimeout(()=>this.playNote(n,0.5,'sine',0.15),i*150))},
  playCrystalCollect(){[784,988,1175,1318,1568].forEach((n,i)=>setTimeout(()=>this.playNote(n,0.8-i*0.1,'sine',0.12),i*100))},
  ambientNodes:[],
  startAmbience(){
    if(!G.audioCtx||!G.soundOn)return;this.stopAmbience();const ac=G.audioCtx;
    const buf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const ns=ac.createBufferSource();ns.buffer=buf;ns.loop=true;
    const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=350;
    const ng=ac.createGain();ng.gain.value=0.03;
    ns.connect(fl);fl.connect(ng);ng.connect(G.musicGain);ns.start();
    this.ambientNodes.push(ns,fl,ng);
    [130.81,196,261.63].forEach(f=>{const o=ac.createOscillator();o.type='sine';o.frequency.value=f;
      const g=ac.createGain();g.gain.value=0.015;o.connect(g);g.connect(G.musicGain);o.start();
      this.ambientNodes.push(o,g);});
    // Zone-aware melody: different scales per zone
    const ZONE_SCALES = {
      beach:   [261.63,293.66,329.63,392,440,523.25,587.33,659.25],
      village: [293.66,329.63,369.99,440,493.88,587.33,659.25,739.99],
      forest:  [261.63,293.66,311.13,369.99,415.30,466.16,523.25],
      caves:   [220,246.94,261.63,293.66,311.13,349.23],
      summit:  [349.23,392,440,493.88,523.25,587.33,659.25,698.46],
      ruins:   [246.94,277.18,311.13,369.99,415.30,493.88],
    };
    this.melodyInterval=setInterval(()=>{
      if(!G.soundOn||G.state==='title')return;
      const zone = G.currentZone||'beach';
      const s = ZONE_SCALES[zone] || ZONE_SCALES.beach;
      const isCave = zone==='caves';
      const gain = isCave ? 0.025 : 0.035;
      const dur = isCave ? rng(0.8,2.5) : rng(0.5,1.5);
      const waveType = (zone==='forest'||zone==='ruins') ? 'triangle' : 'sine';
      this.playNote(s[rngInt(0,s.length-1)],dur,waveType,gain,G.musicGain);
    },rng(3000,6000));
  },
  stopAmbience(){this.ambientNodes.forEach(n=>{try{n.stop?.();n.disconnect()}catch(e){}});
    this.ambientNodes=[];if(this.melodyInterval)clearInterval(this.melodyInterval);},
  toggleSound(){
    G.soundOn=!G.soundOn;document.getElementById('sound-toggle').textContent=G.soundOn?'🔊':'🔇';
    if(G.soundOn){if(!G.audioCtx)this.init();else this.startAmbience();G.masterGain.gain.value=0.5;}
    else{this.stopAmbience();if(G.masterGain)G.masterGain.gain.value=0;}
  }
};
document.getElementById('sound-toggle').addEventListener('click',()=>Audio.toggleSound());

// ============ PARTICLES ============
const Particles = {
  add(x,y,o={}){if(G.particles.length>=CFG.PARTICLE_MAX)return;
    G.particles.push({x,y,vx:o.vx||rng(-20,20),vy:o.vy||rng(-40,-10),
      life:o.life||rng(1,3),maxLife:o.life||rng(1,3),size:o.size||rng(2,5),
      color:o.color||'#e8a0c0',alpha:o.alpha||1,type:o.type||'circle',
      gravity:o.gravity||0,fadeRate:o.fadeRate||1,shrink:o.shrink!==undefined?o.shrink:true});
  },
  burst(x,y,c,o={}){for(let i=0;i<c;i++){const a=(Math.PI*2/c)*i+rng(-0.3,0.3),sp=o.speed||rng(30,80);
    this.add(x,y,{...o,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp});}},
  sparkle(x,y,c=5){this.burst(x,y,c,{color:'#f0c0d8',size:rng(2,4),life:rng(0.5,1),speed:rng(20,50)})},
  stars(x,y){this.burst(x,y,8,{color:'#f0d080',size:3,life:1.5,speed:rng(40,80),type:'star'})},
  ambient(zone){
    const p=ZONE_PARTICLES[zone]||ZONE_PARTICLES.beach;
    if(Math.random()<p.rate*G.dt){
      const sx=G.camera.x+rng(0,CFG.VIEW_W),sy=G.camera.y+rng(0,CFG.VIEW_H);
      this.add(sx,sy,{vx:p.vx?rng(...p.vx):rng(-5,5),vy:p.vy?rng(...p.vy):rng(-15,-5),
        life:rng(2,5),size:rng(p.sizeMin||1,p.sizeMax||3),
        color:p.colors[rngInt(0,p.colors.length-1)],alpha:rng(0.3,0.7),gravity:p.gravity||0});
    }
  },
  update(dt){for(let i=G.particles.length-1;i>=0;i--){const p=G.particles[i];p.life-=dt;
    if(p.life<=0){G.particles.splice(i,1);continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;
    p.alpha=(p.life/p.maxLife)*p.fadeRate;if(p.shrink)p.size*=(1-dt*0.3);}},
  render(ctx){for(const p of G.particles){
    const sx=p.x-G.camera.x,sy=p.y-G.camera.y;
    if(sx<-20||sx>CFG.VIEW_W+20||sy<-20||sy>CFG.VIEW_H+20)continue;
    ctx.globalAlpha=clamp(p.alpha,0,1);
    if(p.type==='star')drawStarSimple(ctx,sx,sy,p.size,p.color);
    else{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx,sy,Math.max(0.5,p.size),0,Math.PI*2);ctx.fill();}
  }ctx.globalAlpha=1;}
};
// Pastel particle palettes
const ZONE_PARTICLES = {
  beach:{rate:3,colors:['#f0d8c0','#f0c8d8','#c8e0f0','#f8e8b0'],sizeMin:1,sizeMax:3,vy:[-10,-3],gravity:2},
  village:{rate:2,colors:['#f0c0d8','#d8b0e8','#f8d8a0','#c8d8f0'],sizeMin:1,sizeMax:2,vy:[-15,-5]},
  forest:{rate:4,colors:['#b8e0a0','#f0f0a0','#a0e8c0','#d0f0b0'],sizeMin:1,sizeMax:3,vy:[-8,-2],vx:[-3,3]},
  caves:{rate:3,colors:['#a0d0e8','#c0a0e0','#80b8d8','#e0a0c0'],sizeMin:2,sizeMax:4,vy:[-5,5],vx:[-5,5]},
  summit:{rate:5,colors:['#f0e8f8','#f8d8a0','#d8d0f0','#e0e0e8'],sizeMin:1,sizeMax:2,vy:[-20,-8]}
};

// ============ PASTEL TILE COLORS ============
const TILE_COLORS = {
  // 0=grass 1=water 2=sand 3=path 4=grass2 5=rock/wall 6=flower 7=grass3 8=floor 9=crystal 10=dark 11=shallows 12=snow 13=sky 14=earth 15=wood_floor
  beach:         {0:'#8BAF80',1:'#6BBFBE',2:'#F5EAD5',3:'#E8D8B8',4:'#7FA873',5:'#B8A898',6:'#D48FA0',7:'#95B888',8:'#E8D8B0',9:'#BBA8D9',10:'#6A8875',11:'#88CFC8',12:'#E8E8F5',13:'#8FA8D6',14:'#C8B888',15:'#D4B888'},
  village:       {0:'#8BAF80',1:'#6BBFBE',2:'#F5EAD5',3:'#D8C8A8',4:'#7FA873',5:'#A8A090',6:'#D48FA0',7:'#95B888',8:'#DDD0A8',9:'#BBA8D9',10:'#6A8875',11:'#88CFC8',12:'#E8E8F5',13:'#8FA8D6',14:'#C0A870',15:'#D4B888'},
  forest:        {0:'#7A9E70',1:'#5AAFAE',2:'#C8B898',3:'#8A9878',4:'#527A50',5:'#7A7868',6:'#8BAF80',7:'#6A9868',8:'#A89870',9:'#A090C8',10:'#4A6850',11:'#70B898',12:'#D8E0F0',13:'#607848',14:'#886840',15:'#A08858'},
  caves:         {0:'#5A5878',1:'#485A80',2:'#706878',3:'#787088',4:'#504868',5:'#907888',6:'#8878A8',7:'#5A5878',8:'#686080',9:'#9080C0',10:'#483858',11:'#7098A8',12:'#D8D0E8',13:'#3D2B5E',14:'#806878',15:'#786870'},
  summit:        {0:'#A0A8B0',1:'#8098C0',2:'#D8D0D8',3:'#C0B8C0',4:'#7890A0',5:'#B0A8B8',6:'#BBA8D9',7:'#90A098',8:'#C8C0D0',9:'#BBA8D9',10:'#7080A0',11:'#F2C46D',12:'#E8EAF8',13:'#6858A0',14:'#A09090',15:'#C0B090'},
  mayors_house:  {0:'#D8C8B0',1:'#88B0C8',2:'#F0E8D8',3:'#C8B898',4:'#C8C0A8',5:'#908078',6:'#D4A890',7:'#C8B898',8:'#D8C8A8',9:'#B8A0D0',10:'#907860',11:'#A0C0B0',12:'#E8E8F0',13:'#B8C8D8',14:'#B89870',15:'#C8A870'},
  pips_house:    {0:'#C8D8E8',1:'#88B0C8',2:'#E8F0F8',3:'#C0C8D0',4:'#B8C8D8',5:'#9098A8',6:'#B8C8D8',7:'#A8B8C8',8:'#D0D8E0',9:'#B0C0E0',10:'#8098B0',11:'#A8C8D8',12:'#E8EAF8',13:'#B8C8D8',14:'#A0B0C0',15:'#C0C8D8'},
  general_store: {0:'#D8C8A0',1:'#88B0A0',2:'#F0E8D0',3:'#D0C0A0',4:'#C8B890',5:'#A09078',6:'#D4B880',7:'#C8B898',8:'#D8C898',9:'#C0B0A8',10:'#907850',11:'#A0B890',12:'#E8E8E0',13:'#C8C0B8',14:'#B89860',15:'#C8A860'},
  lunas_observatory:{0:'#4840780',1:'#405080',2:'#6860a0',3:'#605890',4:'#403870',5:'#706890',6:'#7868A8',7:'#504878',8:'#686090',9:'#9080C0',10:'#382860',11:'#6080A0',12:'#D0C8E8',13:'#3D3068',14:'#706088',15:'#584878'}
};

const ZONES = {};

function generateZones() {
  // Beach - 35x25
  ZONES.beach = {
    name: 'Coral Beach', w: 35, h: 25,
    tiles: [], objects: [], npcs: [], items: [], transitions: [],
    skyTop:'#8FA8D6', skyBot:'#BBA8D9',
    fogColor:'rgba(240,210,200,0.06)', ambientColor:'rgba(240,200,180,0.06)',
    spawnX: 17*CFG.TILE, spawnY: 15*CFG.TILE
  };
  const bm = ZONES.beach;
  bm.tiles = Array.from({length:bm.h},()=>Array(bm.w).fill(2));
  for(let y=0;y<bm.h;y++) for(let x=0;x<bm.w;x++){
    // Noise-based organic water border (top/left/corners)
    const n1 = Math.sin(x*0.7+y*0.3)*0.5+Math.sin(x*0.3-y*0.8)*0.5;
    const waterTop = 2 + Math.floor(n1*1.5+1.5);
    const waterLeft = 2 + Math.floor(Math.sin(y*0.6)*1.5+1.5);
    if(y < waterTop) bm.tiles[y][x]=1;
    if(x < waterLeft) bm.tiles[y][x]=1;
    if(x<5&&y<5) bm.tiles[y][x]=1;
    // Wet sand strip (tide zone) — darker sand near water
    if(y===waterTop && x>=waterLeft) bm.tiles[y][x]=11; // shallows = wet sand colour
    // Organic grass/sand boundary on right
    const grassEdge = bm.w-8 + Math.floor(Math.sin(y*0.5)*2);
    if(x > grassEdge) bm.tiles[y][x]=0;
    if(x === grassEdge && Math.sin(x*0.9+y*0.4)>0) bm.tiles[y][x]=Math.random()<0.5?0:2;
    if(x>=30&&x<=32&&y>=8&&y<=14) bm.tiles[y][x]=8;
  }
  bm.objects.push(
    {x:8,y:10,type:'palm',w:2,h:3},{x:14,y:8,type:'palm',w:2,h:3},{x:22,y:18,type:'palm',w:2,h:3},
    {x:10,y:16,type:'driftwood',w:2,h:1},{x:20,y:12,type:'driftwood',w:2,h:1},
    {x:6,y:14,type:'rock_sm',w:1,h:1},{x:18,y:20,type:'rock_sm',w:1,h:1},
    {x:25,y:6,type:'shells',w:1,h:1},{x:12,y:20,type:'shells',w:1,h:1},{x:28,y:18,type:'shells',w:1,h:1},
    {x:30,y:10,type:'signpost',w:1,h:1,text:'→ Village'}
  );
  bm.items.push(
    {id:'shell1',x:25*CFG.TILE+10,y:6*CFG.TILE+10,item:'Spiral Shell',icon:'🐚',taken:false},
    {id:'shell2',x:12*CFG.TILE+10,y:20*CFG.TILE+10,item:'Spiral Shell',icon:'🐚',taken:false},
    {id:'shell3',x:28*CFG.TILE+10,y:18*CFG.TILE+10,item:'Spiral Shell',icon:'🐚',taken:false}
  );
  bm.transitions.push({x:34,y:11,w:1,h:4,to:'village',toX:1*CFG.TILE+24,toY:12*CFG.TILE});

  // Village - 40x30
  ZONES.village = {
    name: 'Starfall Village', w: 40, h: 30,
    tiles: [], objects: [], npcs: [], items: [], transitions: [],
    skyTop:'#9AB5D8', skyBot:'#D4B8D0',
    fogColor:'rgba(220,200,240,0.04)', ambientColor:'rgba(230,200,220,0.05)',
    spawnX: 1*CFG.TILE+24, spawnY: 12*CFG.TILE
  };
  const vm = ZONES.village;
  vm.tiles = Array.from({length:vm.h},()=>Array(vm.w).fill(0));
  // Lay paths first
  function vmPath(ax,ay,bx,by,w){
    let cx=ax,cy=ay;
    while(Math.abs(cx-bx)>0.5||Math.abs(cy-by)>0.5){
      const dx=bx-cx,dy=by-cy;
      if(Math.abs(dx)>Math.abs(dy)) cx+=dx<0?-1:1; else cy+=dy<0?-1:1;
      for(let dy2=-w;dy2<=w;dy2++) for(let dx2=-w;dx2<=w;dx2++){
        const tx=Math.round(cx+dx2),ty=Math.round(cy+dy2);
        if(tx>=0&&tx<vm.w&&ty>=0&&ty<vm.h) vm.tiles[ty][tx]=8;
      }
    }
  }
  vmPath(1,14,39,14,1);   // east-west main road
  vmPath(20,1,20,29,1);   // north-south main road
  vmPath(10,7,20,14,0);   // path from mayor's house
  vmPath(10,22,20,14,0);  // path from pip's house
  vmPath(32,7,20,14,0);   // path from general store
  vmPath(32,22,20,14,0);  // path from luna's observatory
  // Plaza cobblestone ring around fountain
  for(let y=0;y<vm.h;y++) for(let x=0;x<vm.w;x++){
    if(dist(x,y,20,14)<4) vm.tiles[y][x]=14; // earth/cobble plaza
    if(dist(x,y,20,14)<2.5) vm.tiles[y][x]=8; // paved centre
  }
  // Plaza lantern posts at 4 cardinal positions
  vm.objects.push(
    {x:20,y:10,type:'lamp_post',w:1,h:1},
    {x:20,y:17,type:'lamp_post',w:1,h:1},
    {x:17,y:14,type:'lamp_post',w:1,h:1},
    {x:23,y:14,type:'lamp_post',w:1,h:1}
  );
  // Flower pots around plaza edge
  [{x:18,y:11},{x:22,y:11},{x:18,y:16},{x:22,y:16},
   {x:16,y:13},{x:24,y:13},{x:16,y:15},{x:24,y:15}].forEach(p=>
    vm.objects.push({x:p.x,y:p.y,type:'flower_pot',w:1,h:1}));
  // Scattered flowers
  for(let y=0;y<vm.h;y++) for(let x=0;x<vm.w;x++){
    if(vm.tiles[y][x]===0&&Math.random()<0.06) vm.tiles[y][x]=6;
    if(y<1||y>=vm.h-1||x>=vm.w-1) vm.tiles[y][x]=4;
  }
  vm.objects.push(
    {x:6,y:5,type:'house',w:4,h:3,color:'#e8a0a0',roof:'#c87878',label:"Mayor's House"},
    {x:6,y:20,type:'house',w:4,h:3,color:'#a0b8d8',roof:'#7890b0',label:"Pip's House"},
    {x:30,y:5,type:'house',w:4,h:3,color:'#d8c098',roof:'#b8a078',label:'General Store'},
    {x:30,y:20,type:'house',w:4,h:3,color:'#c0a0d8',roof:'#9878b0',label:"Luna's Observatory"},
    {x:19,y:8,type:'fountain',w:2,h:2},{x:14,y:10,type:'bench',w:2,h:1},
    {x:26,y:10,type:'bench',w:2,h:1},{x:12,y:6,type:'tree_village',w:1,h:2},
    {x:28,y:6,type:'tree_village',w:1,h:2},{x:12,y:22,type:'tree_village',w:1,h:2},
    {x:28,y:22,type:'tree_village',w:1,h:2},{x:20,y:3,type:'signpost',w:1,h:1,text:'Starfall Village'},
    {x:19,y:28,type:'signpost',w:1,h:1,text:'↓ Woods'}
  );
  vm.items.push({id:'star_map',x:32*CFG.TILE,y:8*CFG.TILE,item:'Star Map',icon:'🗺️',taken:false});
  vm.transitions.push(
    {x:0,y:11,w:1,h:4,to:'beach',toX:33*CFG.TILE,toY:12*CFG.TILE},
    {x:18,y:29,w:4,h:1,to:'forest',toX:15*CFG.TILE,toY:1*CFG.TILE+24},
    {x:39,y:13,w:1,h:4,to:'caves',toX:1*CFG.TILE+24,toY:12*CFG.TILE},
    // House doors — walk into buildings (y=9/24 = one tile south of house footprint)
    {x:7,y:9,w:2,h:1,to:'mayors_house',toX:6*CFG.TILE,toY:8*CFG.TILE},
    {x:7,y:24,w:2,h:1,to:'pips_house',toX:6*CFG.TILE,toY:8*CFG.TILE},
    {x:31,y:9,w:2,h:1,to:'general_store',toX:7*CFG.TILE,toY:8*CFG.TILE},
    {x:31,y:24,w:2,h:1,to:'lunas_observatory',toX:7*CFG.TILE,toY:12*CFG.TILE}
  );

  // Forest - 35x35
  ZONES.forest = {
    name: 'Whispering Woods', w: 35, h: 35,
    tiles: [], objects: [], npcs: [], items: [], transitions: [],
    skyTop:'#7A9E70', skyBot:'#A8C890',
    fogColor:'rgba(80,120,60,0.08)', ambientColor:'rgba(120,180,100,0.04)',
    spawnX: 15*CFG.TILE, spawnY: 1*CFG.TILE+24
  };
  const fm = ZONES.forest;
  fm.tiles = Array.from({length:fm.h},()=>Array(fm.w).fill(0));
  // Clearings: 3 open glades at fixed positions
  const fClearings = [{cx:8,cy:8,r:4},{cx:24,cy:12,r:3.5},{cx:10,cy:26,r:4}];
  for(let y=0;y<fm.h;y++) for(let x=0;x<fm.w;x++){
    // Noise-based density: denser toward edges, sparse in centre strips
    const n1 = Math.sin(x*0.8+y*0.5)*0.5+Math.cos(x*0.4-y*0.7)*0.5;
    const densityBias = 0.18 + 0.12 * n1;
    if(Math.random()<densityBias+0.1) fm.tiles[y][x]=4;  // dark grass
    if(Math.random()<densityBias*0.6) fm.tiles[y][x]=7;  // mossy
    // Paths
    if((x>=14&&x<=16)&&y<=18)fm.tiles[y][x]=8;
    if((y>=16&&y<=18)&&x>=5&&x<=28)fm.tiles[y][x]=8;
    if((x>=26&&x<=28)&&y>=18&&y<=33)fm.tiles[y][x]=8;
    // Ancient tree glade
    if(dist(x,y,15,17)<5)fm.tiles[y][x]=0;
    if(dist(x,y,15,17)<3)fm.tiles[y][x]=6;  // lush glade centre
    // Stream
    if(Math.abs(x-(10+Math.sin(y*0.5)*3))<1&&y>10)fm.tiles[y][x]=1;
    // Mushroom glade
    if(dist(x,y,8,28)<4)fm.tiles[y][x]=0;
    // Open clearings — grass floor, flower-dotted
    for(const cl of fClearings){
      if(dist(x,y,cl.cx,cl.cy)<cl.r) fm.tiles[y][x]=6;
      if(dist(x,y,cl.cx,cl.cy)<cl.r*0.55) fm.tiles[y][x]=0;
    }
  }
  fm.objects.push({x:15,y:17,type:'ancient_tree',w:3,h:3},
    {x:5,y:10,type:'mushroom_big',w:1,h:1},{x:8,y:26,type:'mushroom_big',w:1,h:1},{x:30,y:30,type:'mushroom_big',w:1,h:1});
  fm.items.push(
    {id:'mush1',x:5*CFG.TILE+10,y:10*CFG.TILE+10,item:'Glow Mushroom',icon:'🍄',taken:false},
    {id:'mush2',x:8*CFG.TILE+10,y:26*CFG.TILE+10,item:'Glow Mushroom',icon:'🍄',taken:false},
    {id:'mush3',x:30*CFG.TILE+10,y:30*CFG.TILE+10,item:'Glow Mushroom',icon:'🍄',taken:false},
    {id:'crystal_forest',x:15*CFG.TILE,y:17*CFG.TILE-20,item:'Starfall Crystal',icon:'💎',taken:false,crystal:true}
  );
  fm.transitions.push({x:14,y:0,w:4,h:1,to:'village',toX:19*CFG.TILE,toY:28*CFG.TILE-24},
    {x:26,y:34,w:3,h:1,to:'summit',toX:12*CFG.TILE,toY:1*CFG.TILE+24});

  // Caves - 30x30
  ZONES.caves = {
    name: 'Crystal Caves', w: 30, h: 30,
    tiles: [], objects: [], npcs: [], items: [], transitions: [],
    skyTop:'#3D2B5E', skyBot:'#5A4878',
    fogColor:'rgba(80,60,100,0.1)', ambientColor:'rgba(120,100,160,0.06)',
    spawnX: 1*CFG.TILE+24, spawnY: 12*CFG.TILE
  };
  const cm = ZONES.caves;
  cm.tiles = Array.from({length:cm.h},()=>Array(cm.w).fill(5));
  function carvePath(sx,sy,ex,ey,w){let cx=sx,cy=sy;
    while(Math.abs(cx-ex)>0.5||Math.abs(cy-ey)>0.5){
      for(let dy=-w;dy<=w;dy++)for(let dx=-w;dx<=w;dx++){
        const tx=Math.round(cx+dx),ty=Math.round(cy+dy);
        if(tx>=0&&tx<cm.w&&ty>=0&&ty<cm.h)cm.tiles[ty][tx]=10;}
      if(Math.abs(cx-ex)>Math.abs(cy-ey))cx+=cx<ex?1:-1;else cy+=cy<ey?1:-1;}}
  carvePath(1,12,15,12,2);carvePath(15,12,15,5,2);carvePath(15,5,25,5,2);
  carvePath(25,5,25,15,2);carvePath(25,15,15,22,2);carvePath(15,22,8,22,2);carvePath(8,22,8,28,2);
  for(let y=0;y<cm.h;y++)for(let x=0;x<cm.w;x++){if(cm.tiles[y][x]===10&&Math.random()<0.05)cm.tiles[y][x]=11;}
  for(let y=20;y<26;y++)for(let x=5;x<12;x++){if(dist(x,y,8,23)<3)cm.tiles[y][x]=1;}
  cm.objects.push({x:15,y:5,type:'crystal_big',w:1,h:2},{x:25,y:15,type:'crystal_big',w:1,h:2},
    {x:3,y:12,type:'torch',w:1,h:1},{x:15,y:10,type:'torch',w:1,h:1},{x:25,y:8,type:'torch',w:1,h:1},{x:12,y:22,type:'torch',w:1,h:1});
  cm.items.push({id:'crystal_cave1',x:15*CFG.TILE,y:5*CFG.TILE,item:'Starfall Crystal',icon:'💎',taken:false,crystal:true},
    {id:'crystal_cave2',x:8*CFG.TILE,y:27*CFG.TILE,item:'Starfall Crystal',icon:'💎',taken:false,crystal:true},
    {id:'lantern',x:3*CFG.TILE+10,y:14*CFG.TILE,item:'Cave Lantern',icon:'🏮',taken:false});
  cm.transitions.push({x:0,y:11,w:1,h:3,to:'village',toX:38*CFG.TILE,toY:14*CFG.TILE});

  // Summit - 25x25
  ZONES.summit = {
    name: 'Moonpeak Summit', w: 25, h: 25,
    tiles: [], objects: [], npcs: [], items: [], transitions: [],
    skyTop:'#3D3068', skyBot:'#6A5890',
    fogColor:'rgba(120,100,160,0.06)', ambientColor:'rgba(180,160,210,0.06)',
    spawnX: 12*CFG.TILE, spawnY: 1*CFG.TILE+24
  };
  const sm = ZONES.summit;
  sm.tiles = Array.from({length:sm.h},()=>Array(sm.w).fill(3));
  for(let y=0;y<sm.h;y++)for(let x=0;x<sm.w;x++){
    if(y<2||y>sm.h-2||x<2||x>sm.w-2)sm.tiles[y][x]=5;
    if(x>=11&&x<=13&&y>=1&&y<=15)sm.tiles[y][x]=8;
    if(dist(x,y,12,18)<5)sm.tiles[y][x]=3;
    if(dist(x,y,12,18)<3)sm.tiles[y][x]=9;
    if(y<8&&Math.random()<0.15)sm.tiles[y][x]=12;
  }
  sm.objects.push({x:12,y:18,type:'star_altar',w:2,h:2},{x:8,y:10,type:'rock_lg',w:2,h:2},{x:16,y:8,type:'rock_lg',w:2,h:2},{x:5,y:20,type:'telescope',w:1,h:1});
  sm.items.push({id:'crystal_summit1',x:12*CFG.TILE,y:16*CFG.TILE,item:'Starfall Crystal',icon:'💎',taken:false,crystal:true},
    {id:'crystal_summit2',x:12*CFG.TILE,y:20*CFG.TILE,item:'Starfall Crystal',icon:'💎',taken:false,crystal:true});
  sm.transitions.push({x:11,y:0,w:3,h:1,to:'forest',toX:27*CFG.TILE,toY:33*CFG.TILE-24});

  // ── Interior Zones ──────────────────────────────────────
  const T = CFG.TILE;

  // Mayor's House interior
  ZONES.mayors_house = {
    name: "Mayor's House", w:12, h:10,
    tiles:[], objects:[], npcs:[], items:[], transitions:[],
    skyTop:'#D4B8D0', skyBot:'#F0DDD0',
    fogColor:'rgba(220,180,200,0.04)', ambientColor:'rgba(240,200,180,0.06)',
    spawnX:6*T, spawnY:8*T
  };
  const mh = ZONES.mayors_house;
  mh.tiles = Array.from({length:mh.h},(_,y)=>Array.from({length:mh.w},(_,x)=>{
    if(y===0||y===mh.h-1||x===0||x===mh.w-1) return 5;
    if(y===mh.h-2&&x===5) return 8; // door tile
    return 15; // floor
  }));
  mh.objects.push(
    {x:1,y:1,type:'bookshelf',w:3,h:1,color:'#8B6050'},
    {x:8,y:1,type:'bookshelf',w:3,h:1,color:'#8B6050'},
    {x:4,y:3,type:'desk',w:3,h:2,color:'#C8A878'},
    {x:1,y:5,type:'fireplace',w:2,h:2,color:'#E07050'},
    {x:9,y:5,type:'chair',w:1,h:1,color:'#A07850'}
  );
  mh.transitions.push({x:5,y:mh.h-1,w:2,h:1,to:'village',toX:8*T,toY:8*T});

  // Pip's House interior
  ZONES.pips_house = {
    name: "Pip's House", w:12, h:10,
    tiles:[], objects:[], npcs:[], items:[], transitions:[],
    skyTop:'#A8C8D8', skyBot:'#D8EEF0',
    fogColor:'rgba(180,220,240,0.04)', ambientColor:'rgba(180,220,240,0.04)',
    spawnX:6*T, spawnY:8*T
  };
  const ph = ZONES.pips_house;
  ph.tiles = Array.from({length:ph.h},(_,y)=>Array.from({length:ph.w},(_,x)=>{
    if(y===0||y===ph.h-1||x===0||x===ph.w-1) return 5;
    if(y===ph.h-2&&x===5) return 8;
    return 15;
  }));
  ph.objects.push(
    {x:1,y:1,type:'bed',w:2,h:2,color:'#90B8D8'},
    {x:7,y:1,type:'wardrobe',w:2,h:2,color:'#8898C8'},
    {x:3,y:5,type:'table',w:2,h:1,color:'#D0B890'},
    {x:3,y:4,type:'chair',w:1,h:1,color:'#B09870'},
    {x:5,y:4,type:'chair',w:1,h:1,color:'#B09870'},
    {x:9,y:6,type:'chest',w:1,h:1,color:'#C09060'}
  );
  ph.items.push({id:"pip_note",x:9*T,y:6*T,item:"Pip's Journal",icon:"📓",taken:false});
  ph.transitions.push({x:5,y:ph.h-1,w:2,h:1,to:'village',toX:8*T,toY:23*T});

  // General Store interior
  ZONES.general_store = {
    name:'General Store', w:14, h:10,
    tiles:[], objects:[], npcs:[], items:[], transitions:[],
    skyTop:'#D8C898', skyBot:'#F0E8C8',
    fogColor:'rgba(220,200,160,0.04)', ambientColor:'rgba(240,220,160,0.05)',
    spawnX:7*T, spawnY:8*T
  };
  const gs2 = ZONES.general_store;
  gs2.tiles = Array.from({length:gs2.h},(_,y)=>Array.from({length:gs2.w},(_,x)=>{
    if(y===0||y===gs2.h-1||x===0||x===gs2.w-1) return 5;
    if(y===gs2.h-2&&x===6) return 8;
    return 15;
  }));
  gs2.objects.push(
    {x:1,y:1,type:'shelf',w:3,h:1,color:'#B89060',label:'Potions'},
    {x:1,y:3,type:'shelf',w:3,h:1,color:'#B89060',label:'Tools'},
    {x:9,y:1,type:'shelf',w:3,h:1,color:'#B89060',label:'Seeds'},
    {x:9,y:3,type:'shelf',w:3,h:1,color:'#B89060',label:'Maps'},
    {x:5,y:2,type:'counter',w:4,h:1,color:'#C8A870'},
    {x:6,y:6,type:'crate',w:2,h:1,color:'#C89858'}
  );
  gs2.items.push({id:'shop_compass',x:10*T,y:2*T,item:'Island Compass',icon:'🧭',taken:false});
  gs2.transitions.push({x:6,y:gs2.h-1,w:2,h:1,to:'village',toX:32*T,toY:8*T});

  // Luna's Observatory interior
  ZONES.lunas_observatory = {
    name:"Luna's Observatory", w:14, h:14,
    tiles:[], objects:[], npcs:[], items:[], transitions:[],
    skyTop:'#3D3068', skyBot:'#6A5890',
    fogColor:'rgba(100,80,140,0.06)', ambientColor:'rgba(140,120,200,0.06)',
    spawnX:7*T, spawnY:12*T
  };
  const lo = ZONES.lunas_observatory;
  lo.tiles = Array.from({length:lo.h},(_,y)=>Array.from({length:lo.w},(_,x)=>{
    if(y===0||y===lo.h-1||x===0||x===lo.w-1) return 5;
    if(y===lo.h-2&&x===6) return 8;
    // Round room feel
    const cx=6.5,cy=6.5,d=Math.sqrt((x-cx)**2+(y-cy)**2);
    if(d>5.8) return 5;
    return 15;
  }));
  lo.objects.push(
    {x:5,y:2,type:'telescope_big',w:4,h:3,color:'#907898'},
    {x:1,y:8,type:'bookshelf',w:2,h:1,color:'#706080'},
    {x:10,y:8,type:'bookshelf',w:2,h:1,color:'#706080'},
    {x:5,y:7,type:'star_chart',w:4,h:1,color:'#B0A0D0'},
    {x:1,y:4,type:'crystal_sm',w:1,h:1,color:'#D0C0F0'},
    {x:12,y:4,type:'crystal_sm',w:1,h:1,color:'#C0D0F0'}
  );
  lo.items.push({id:'luna_scroll',x:5*T+10,y:7*T,item:'Star Scroll',icon:'📜',taken:false});
  lo.transitions.push({x:6,y:lo.h-1,w:2,h:1,to:'village',toX:32*T,toY:23*T});
}
