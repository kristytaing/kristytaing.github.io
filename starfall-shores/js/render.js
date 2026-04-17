// ── Bridge: Aliases between old (G/ctx) and new (GS/CTX) code ──
const GS = G;
const CTX = ctx;
const INPUT = { keys: keys, joystick: { active: false, dx: 0, dy: 0 } };
function generateAllZones() { generateZones(); }
function initAudio() { Audio.init(); }
function playSound(type) {
  switch(type) {
    case 'step': Audio.playStep(); break;
    case 'pickup': Audio.playPickup(); break;
    case 'talk': case 'type': Audio.playInteract(); break;
    case 'quest': Audio.playQuestComplete(); break;
    case 'zone': Audio.playChime(392, 2); break;
    case 'music': Audio.startAmbience(); break;
    case 'ending': Audio.playCrystalCollect(); break;
    default: Audio.playMenuClick();
  }
}
// Fix GS fields that new code expects but old G doesn't have
G.transitioning = false;
G.transitionAlpha = 0;
G.transitionTarget = null;
G.transitionPhase = null;
G.dialogue = { active: false, lines: [], lineIndex: 0, charIndex: 0, timer: 0, seen: {} };
G.notifications = [];
G.quests = { active: [], completed: [] };
G.crystalsFound = 0;
G.ending = false;
G.endingTimer = 0;
G.endingPhase = 0;
G.screenShake = 0;
G.screenFlash = 0;

// ── Part 3: World Rendering ──────────────────────────────
function renderWorld(){
  const z = ZONES[GS.currentZone];
  if(!z) return;
  const cam = GS.camera;
  // Sky gradient
  const skyGrad = CTX.createLinearGradient(0,0,0,CFG.VIEW_H);
  skyGrad.addColorStop(0, z.skyTop);
  skyGrad.addColorStop(1, z.skyBot);
  CTX.fillStyle = skyGrad;
  CTX.fillRect(0,0,CFG.VIEW_W,CFG.VIEW_H);
  // Distant soft clouds
  CTX.globalAlpha = 0.18;
  for(let i=0;i<6;i++){
    const cx = ((i*320 + GS.time*0.008*(i%2?1:-0.5))%1600)-200;
    const cy = 30 + i*18 + Math.sin(GS.time*0.001+i)*10;
    CTX.fillStyle = '#fff';
    CTX.beginPath();
    CTX.ellipse(cx, cy, 80+i*10, 18+i*3, 0, 0, Math.PI*2);
    CTX.fill();
    CTX.beginPath();
    CTX.ellipse(cx+40, cy-5, 50+i*5, 14+i*2, 0, 0, Math.PI*2);
    CTX.fill();
  }
  CTX.globalAlpha = 1;
  // Tiles
  const T = CFG.TILE;
  const startX = Math.max(0, Math.floor(cam.x/T));
  const startY = Math.max(0, Math.floor(cam.y/T));
  const endX = Math.min(z.w, Math.ceil((cam.x+CFG.VIEW_W)/T)+1);
  const endY = Math.min(z.h, Math.ceil((cam.y+CFG.VIEW_H)/T)+1);
  for(let y=startY;y<endY;y++){
    for(let x=startX;x<endX;x++){
      const tid = z.tiles[y]?z.tiles[y][x]:0;
      const sx = x*T - cam.x;
      const sy = y*T - cam.y;
      const colors = TILE_COLORS[GS.currentZone] || TILE_COLORS.beach;
      const base = colors[tid] || '#90c890';
      // Per-tile color variation
      const hash = tileHashInt(x,y,GS.currentZone);
      const r = parseInt(base.slice(1,3),16);
      const g = parseInt(base.slice(3,5),16);
      const b = parseInt(base.slice(5,7),16);
      const vr = Math.max(0,Math.min(255, r + (hash%13)-6));
      const vg = Math.max(0,Math.min(255, g + ((hash>>4)%13)-6));
      const vb = Math.max(0,Math.min(255, b + ((hash>>8)%13)-6));
      CTX.fillStyle = `rgb(${vr},${vg},${vb})`;
      CTX.fillRect(sx, sy, T+1, T+1);
      // Tile details
      renderTileDetail(tid, sx, sy, T, hash, GS.currentZone);
    }
  }
}
function tileHashInt(x,y,zone){
  let h = (x*374761 + y*668265 + (zone.charCodeAt(0)||0)*91831) & 0xFFFFFF;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  return (h >> 16) ^ h;
}
function renderTileDetail(tid, sx, sy, T, hash, zone){
  const rng = () => { hash = (hash * 1103515245 + 12345) & 0x7fffffff; return (hash%1000)/1000; };

  // Grass tiles — soft flat organic shapes, no hard outlines
  if(tid===0||tid===4||tid===6||tid===7||tid===10){
    CTX.save();
    CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    if(rng()<0.4){
      const px=sx+rng()*T, py=sy+rng()*T, pr=6+rng()*10;
      CTX.globalAlpha=0.08+rng()*0.07;
      CTX.fillStyle=rng()<0.5?'#7FA873':'#A8C890';
      CTX.beginPath(); CTX.ellipse(px,py,pr,pr*0.7,rng()*Math.PI,0,Math.PI*2); CTX.fill();
      CTX.globalAlpha=1;
    }
    const tuftCount=3+Math.floor(rng()*3);
    for(let i=0;i<tuftCount;i++){
      const gx=sx+rng()*T, gy=sy+rng()*T, gh=2+rng()*3.5;
      CTX.globalAlpha=0.16+rng()*0.13;
      CTX.fillStyle=rng()<0.5?'#7FA873':'#5A8850';
      CTX.beginPath(); CTX.ellipse(gx,gy,1,gh,0,0,Math.PI*2); CTX.fill();
      CTX.globalAlpha=1;
    }
    if(rng()<0.14){
      const fx=sx+8+rng()*(T-16), fy=sy+8+rng()*(T-16);
      const fc=['#D48FA0','#F2C46D','#BBA8D9','#8FA8D6','#F5EAD5'][Math.floor(rng()*5)];
      CTX.fillStyle=fc; CTX.globalAlpha=0.82;
      for(let p=0;p<5;p++){
        const a=p*Math.PI*2/5;
        CTX.beginPath(); CTX.ellipse(fx+Math.cos(a)*4,fy+Math.sin(a)*4,3,1.8,a,0,Math.PI*2); CTX.fill();
      }
      CTX.fillStyle='#F2C46D'; CTX.globalAlpha=1;
      CTX.beginPath(); CTX.arc(fx,fy,2,0,Math.PI*2); CTX.fill();
    }
    CTX.restore();
  }

  // Shoreline foam on wet-sand/shallows tiles (tid===11)
  if(tid===11){
    CTX.save(); CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    // Wet surface reflection sheen (sky colour tint)
    const reflGrad = CTX.createLinearGradient(sx,sy,sx,sy+T);
    reflGrad.addColorStop(0,'rgba(160,200,220,0.18)');
    reflGrad.addColorStop(1,'rgba(160,200,220,0.04)');
    CTX.fillStyle=reflGrad; CTX.fillRect(sx,sy,T,T);
    const foamPhase = GS.time*0.002;
    for(let i=0;i<4;i++){
      const fx = sx + (rng()*T);
      const fy = sy + T*0.25 + Math.sin(foamPhase+fx*0.05+i)*5;
      const fw = 5+rng()*10, fa = 0.28+Math.sin(foamPhase*1.3+i*2)*0.16;
      CTX.globalAlpha = Math.max(0,fa);
      CTX.fillStyle = '#ffffff';
      CTX.beginPath(); CTX.ellipse(fx,fy,fw,2.2,0,0,Math.PI*2); CTX.fill();
    }
    // Specular highlight dots
    for(let i=0;i<2;i++){
      const hx=sx+rng()*T, hy=sy+rng()*T;
      CTX.globalAlpha=0.12+Math.sin(GS.time*0.004+hx)*0.08;
      CTX.fillStyle='#E8F4FF';
      CTX.beginPath(); CTX.arc(hx,hy,1+rng()*1.5,0,Math.PI*2); CTX.fill();
    }
    CTX.globalAlpha=1; CTX.restore();
  }
  // Water — smooth shimmer bands only, flat
  if(tid===1||tid===7||tid===11){
    CTX.save();
    CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    const shimY=sy+(T*0.35)+Math.sin(GS.time*0.0015+sx*0.03)*5;
    const shimGrad=CTX.createLinearGradient(sx,shimY-4,sx,shimY+4);
    shimGrad.addColorStop(0,'rgba(255,255,255,0)');
    shimGrad.addColorStop(0.5,'rgba(255,255,255,0.14)');
    shimGrad.addColorStop(1,'rgba(255,255,255,0)');
    CTX.fillStyle=shimGrad; CTX.fillRect(sx,shimY-4,T,8);
    const hx=sx+T*0.3+Math.sin(GS.time*0.002+sy*0.05)*8, hy=sy+T*0.65;
    CTX.globalAlpha=0.09+Math.sin(GS.time*0.003+hx)*0.04;
    CTX.fillStyle='#F5EAD5';
    CTX.beginPath(); CTX.ellipse(hx,hy,7,2.5,0,0,Math.PI*2); CTX.fill();
    CTX.globalAlpha=1;
    CTX.restore();
  }

  // Sand/path — warm grain stipple
  if(tid===2||tid===3){
    CTX.save();
    CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    const dotCount=5+Math.floor(rng()*6);
    for(let i=0;i<dotCount;i++){
      const dx=sx+rng()*T, dy=sy+rng()*T;
      CTX.globalAlpha=0.07+rng()*0.08;
      CTX.fillStyle=rng()<0.5?'#C8B070':'#E8D8A0';
      CTX.beginPath(); CTX.arc(dx,dy,0.8+rng()*1,0,Math.PI*2); CTX.fill();
    }
    CTX.globalAlpha=1;
    CTX.restore();
  }

  // Crystal ground — flat glowing shards
  if(tid===9){
    CTX.save();
    CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    if(rng()<0.3){
      const cx=sx+5+rng()*(T-10), cy=sy+5+rng()*(T-10);
      const pulse=0.3+Math.sin(GS.time*0.003+cx+cy)*0.25;
      CTX.globalAlpha=pulse*0.6;
      CTX.fillStyle='#BBA8D9';
      const sh=5+rng()*6;
      CTX.beginPath(); CTX.moveTo(cx,cy-sh); CTX.lineTo(cx+sh*0.5,cy); CTX.lineTo(cx,cy+sh); CTX.lineTo(cx-sh*0.5,cy); CTX.closePath(); CTX.fill();
      CTX.globalAlpha=pulse*0.3; CTX.fillStyle='#F5EAD5';
      CTX.beginPath(); CTX.moveTo(cx,cy-sh*0.5); CTX.lineTo(cx+sh*0.25,cy); CTX.lineTo(cx,cy+sh*0.5); CTX.lineTo(cx-sh*0.25,cy); CTX.closePath(); CTX.fill();
      CTX.globalAlpha=1;
    }
    CTX.restore();
  }

  // Snow — soft flat flakes
  if(tid===12){
    CTX.save();
    CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    if(rng()<0.18){
      const fx=sx+4+rng()*(T-8), fy=sy+4+rng()*(T-8);
      const pulse=0.12+Math.sin(GS.time*0.002+fx)*0.08;
      CTX.globalAlpha=pulse; CTX.fillStyle='#E8EAF8';
      CTX.beginPath(); CTX.arc(fx,fy,2+rng()*2,0,Math.PI*2); CTX.fill();
      CTX.globalAlpha=1;
    }
    CTX.restore();
  }

  // Dark floor — plum depth patches
  if(tid===15){
    // Wood floor planks
    CTX.save(); CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    CTX.strokeStyle='rgba(0,0,0,0.07)'; CTX.lineWidth=1;
    const plankW = T/3;
    for(let i=0;i<3;i++){
      CTX.beginPath(); CTX.moveTo(sx+i*plankW,sy); CTX.lineTo(sx+i*plankW,sy+T); CTX.stroke();
    }
    // horizontal joint offset per column
    const off = (hash%2)*T*0.5;
    CTX.beginPath(); CTX.moveTo(sx,sy+T*0.5+off); CTX.lineTo(sx+plankW,sy+T*0.5+off); CTX.stroke();
    CTX.beginPath(); CTX.moveTo(sx+plankW,sy+T*0.5+(1-off/T)*T*0.5); CTX.lineTo(sx+plankW*2,sy+T*0.5+(1-off/T)*T*0.5); CTX.stroke();
    CTX.restore();
  }
  if(tid===5||tid===8||tid===10){
    CTX.save();
    CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    if(rng()<0.22){
      const px=sx+rng()*T, py=sy+rng()*T;
      CTX.globalAlpha=0.05+rng()*0.07;
      CTX.fillStyle='#3D2B5E';
      CTX.beginPath(); CTX.ellipse(px,py,5+rng()*7,3+rng()*4,rng()*Math.PI,0,Math.PI*2); CTX.fill();
      CTX.globalAlpha=1;
    }
    CTX.restore();
  }

  // Cave formations — stalactites from top, stalagmites from bottom on floor/wall boundary tiles
  if(tid===10 && zone==='caves'){
    CTX.save(); CTX.beginPath(); CTX.rect(sx,sy,T,T); CTX.clip();
    // Stalactite (from ceiling — top of tile)
    if(rng()<0.28){
      const fx=sx+4+rng()*(T-8);
      const fh=4+rng()*9;
      const fw=2+rng()*2;
      CTX.globalAlpha=0.55+rng()*0.2;
      const stalGrad=CTX.createLinearGradient(fx,sy,fx,sy+fh);
      stalGrad.addColorStop(0,'#5A4070'); stalGrad.addColorStop(1,'#3D2B5E');
      CTX.fillStyle=stalGrad;
      CTX.beginPath(); CTX.moveTo(fx-fw,sy); CTX.lineTo(fx+fw,sy); CTX.lineTo(fx,sy+fh); CTX.closePath(); CTX.fill();
      // Crystal tip highlight
      CTX.globalAlpha=0.3; CTX.fillStyle='#BBA8D9';
      CTX.beginPath(); CTX.arc(fx,sy+fh-1,fw*0.5,0,Math.PI*2); CTX.fill();
      CTX.globalAlpha=1;
    }
    // Stalagmite (from floor — bottom of tile)
    if(rng()<0.22){
      const fx=sx+4+rng()*(T-8);
      const fh=3+rng()*7;
      const fw=1.5+rng()*2;
      CTX.globalAlpha=0.5+rng()*0.2;
      const stagGrad=CTX.createLinearGradient(fx,sy+T,fx,sy+T-fh);
      stagGrad.addColorStop(0,'#5A4070'); stagGrad.addColorStop(1,'#7A60A0');
      CTX.fillStyle=stagGrad;
      CTX.beginPath(); CTX.moveTo(fx-fw,sy+T); CTX.lineTo(fx+fw,sy+T); CTX.lineTo(fx,sy+T-fh); CTX.closePath(); CTX.fill();
      CTX.globalAlpha=1;
    }
    CTX.restore();
  }
}


// ── Object Rendering ──────────────────────────────
function renderObject(obj, camX, camY){
  const T = CFG.TILE;
  const x = obj.x*T - camX;
  const y = obj.y*T - camY;
  const w = (obj.w||1)*T;
  const h = (obj.h||1)*T;
  const bob = Math.sin(GS.time*0.002 + obj.x*3)*2;
  // Elevation shadow: cast a soft ground shadow for tall objects
  if(obj.w>=1&&obj.h>=1&&obj.type!=='torch'&&obj.type!=='crystal_sm'){
    const shadowAlpha = GS.currentZone==='summit'?0.22:GS.currentZone==='caves'?0.12:0.1;
    const sw = w*0.8, sh = h*0.22;
    const grad = CTX.createRadialGradient(x+w/2,y+h+2,0,x+w/2,y+h+2,sw*0.7);
    grad.addColorStop(0,`rgba(0,0,0,${shadowAlpha})`);
    grad.addColorStop(1,'rgba(0,0,0,0)');
    CTX.fillStyle=grad;
    CTX.beginPath(); CTX.ellipse(x+w/2, y+h+2, sw*0.5, sh, 0, 0, Math.PI*2); CTX.fill();
  }
  switch(obj.type){
    case 'palm_tree':
      // Trunk
      CTX.fillStyle = '#C8A870';
      CTX.fillRect(x+w*0.4, y+h*0.3, w*0.2, h*0.7);
      
      // Trunk lines
      CTX.strokeStyle = 'rgba(160,120,70,0.2)';
      CTX.lineWidth = 1;
      for(let i=0;i<4;i++){
        const ly = y+h*0.35+i*h*0.15;
        CTX.beginPath(); CTX.moveTo(x+w*0.4,ly); CTX.lineTo(x+w*0.6,ly); CTX.stroke();
      }
      // Fronds
      CTX.fillStyle = '#8BAF80';
      for(let i=0;i<5;i++){
        const angle = -Math.PI*0.8 + i*Math.PI*0.4;
        const sway = Math.sin(GS.time*0.002+i)*0.1;
        CTX.save();
        CTX.translate(x+w*0.5, y+h*0.3);
        CTX.rotate(angle+sway);
        CTX.beginPath();
        CTX.ellipse(0, -w*0.5, w*0.12, w*0.5, 0, 0, Math.PI*2);
        CTX.fill();
        
        CTX.restore();
      }
      // Coconuts
      CTX.fillStyle = '#C8A060';
      CTX.beginPath(); CTX.arc(x+w*0.45,y+h*0.32,3,0,Math.PI*2); CTX.fill();
      CTX.beginPath(); CTX.arc(x+w*0.55,y+h*0.34,3,0,Math.PI*2); CTX.fill();
      break;
    case 'house':
      // Wall
      CTX.fillStyle = obj.color || '#e8b0b0';
      CTX.fillRect(x+4, y+h*0.35, w-8, h*0.65);
      
      // Wall texture
      CTX.strokeStyle = 'rgba(0,0,0,0.05)';
      CTX.lineWidth = 1;
      for(let i=0;i<3;i++){
        const ly = y+h*0.4+i*12;
        CTX.beginPath(); CTX.moveTo(x+6,ly); CTX.lineTo(x+w-6,ly); CTX.stroke();
      }
      // Roof
      CTX.fillStyle = obj.roof || '#c88080';
      CTX.beginPath();
      CTX.moveTo(x, y+h*0.35);
      CTX.lineTo(x+w*0.5, y);
      CTX.lineTo(x+w, y+h*0.35);
      CTX.fill();
      
      // Door
      CTX.fillStyle = '#a07850';
      CTX.fillRect(x+w*0.38, y+h*0.55, w*0.24, h*0.45);
      // Door knob
      CTX.fillStyle = '#d0b080';
      CTX.beginPath(); CTX.arc(x+w*0.55, y+h*0.78, 2, 0, Math.PI*2); CTX.fill();
      // Window
      CTX.fillStyle = '#c8e8f8';
      CTX.fillRect(x+w*0.12, y+h*0.45, w*0.18, w*0.16);
      CTX.fillRect(x+w*0.7, y+h*0.45, w*0.18, w*0.16);
      // Window cross
      CTX.strokeStyle = 'rgba(180,140,120,0.5)';
      CTX.lineWidth = 1;
      CTX.beginPath();
      CTX.moveTo(x+w*0.21,y+h*0.45); CTX.lineTo(x+w*0.21,y+h*0.45+w*0.16);
      CTX.moveTo(x+w*0.12,y+h*0.45+w*0.08); CTX.lineTo(x+w*0.3,y+h*0.45+w*0.08);
      CTX.stroke();
      // Label
      if(obj.label){
        CTX.fillStyle = 'rgba(255,240,250,0.85)';
        CTX.font = '9px sans-serif';
        const tw = CTX.measureText(obj.label).width;
        CTX.fillRect(x+w*0.5-tw*0.5-4, y-14, tw+8, 14);
        CTX.fillStyle = '#805070';
        CTX.textAlign = 'center';
        CTX.fillText(obj.label, x+w*0.5, y-3);
        CTX.textAlign = 'left';
      }
      break;
    case 'fountain':
      // Basin
      CTX.fillStyle = '#c0b0a0';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5, y+h*0.7, w*0.45, h*0.2, 0, 0, Math.PI*2);
      CTX.fill();
      // Water
      CTX.fillStyle = '#90c8e0';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5, y+h*0.68, w*0.38, h*0.15, 0, 0, Math.PI*2);
      CTX.fill();
      // Pillar
      CTX.fillStyle = '#d0c0b0';
      CTX.fillRect(x+w*0.42, y+h*0.25, w*0.16, h*0.45);
      // Water drops
      const dropPhase = (GS.time*0.003)%1;
      for(let i=0;i<4;i++){
        const da = i*Math.PI*0.5;
        const dp = (dropPhase+i*0.25)%1;
        const ddx = Math.cos(da)*w*0.3*dp;
        const ddy = -15*(1-dp) + 15*dp*dp;
        CTX.fillStyle = `rgba(160,210,240,${0.6*(1-dp)})`;
        CTX.beginPath(); CTX.arc(x+w*0.5+ddx, y+h*0.3+ddy, 2, 0, Math.PI*2); CTX.fill();
      }
      break;
    case 'tree':
      // Trunk
      CTX.fillStyle = '#b89878';
      CTX.fillRect(x+w*0.35, y+h*0.4, w*0.3, h*0.6);
      // Canopy layers
      const greens = ['#80b870','#90c880','#70a860'];
      for(let i=0;i<3;i++){
        CTX.fillStyle = greens[i];
        CTX.beginPath();
        CTX.ellipse(x+w*0.5+(i-1)*6, y+h*0.25-i*5+bob, w*0.4+i*3, h*0.25+i*2, 0, 0, Math.PI*2);
        CTX.fill();
      }
      break;
    case 'big_tree':
      CTX.fillStyle = '#a08868';
      CTX.fillRect(x+w*0.3, y+h*0.35, w*0.4, h*0.65);
      // Roots
      CTX.strokeStyle = '#a08868';
      CTX.lineWidth = 3;
      CTX.beginPath(); CTX.moveTo(x+w*0.3,y+h*0.9); CTX.lineTo(x+w*0.1,y+h); CTX.stroke();
      CTX.beginPath(); CTX.moveTo(x+w*0.7,y+h*0.9); CTX.lineTo(x+w*0.9,y+h); CTX.stroke();
      // Big canopy
      for(let i=0;i<4;i++){
        CTX.fillStyle = `rgba(${100+i*15},${170+i*10},${80+i*10},0.85)`;
        CTX.beginPath();
        CTX.ellipse(x+w*0.5+(i%2?8:-8), y+h*0.2-i*8+bob, w*0.5, h*0.22, 0, 0, Math.PI*2);
        CTX.fill();
      }
      break;
    case 'crystal':
    case 'crystal_large':
      const cw = obj.type==='crystal_large'?w:w*0.6;
      const ch = obj.type==='crystal_large'?h:h*0.7;
      const glow = 0.3+Math.sin(GS.time*0.003+obj.x)*0.2;
      // Glow
      CTX.globalAlpha = glow;
      CTX.fillStyle = '#d0b0f0';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5,y+h*0.5,cw*0.6,ch*0.4,0,0,Math.PI*2);
      CTX.fill();
      CTX.globalAlpha = 1;
      // Crystal body
      CTX.fillStyle = '#c8a0e8';
      CTX.beginPath();
      CTX.moveTo(x+w*0.5,y+h*0.5-ch*0.5);
      CTX.lineTo(x+w*0.5+cw*0.3,y+h*0.5+ch*0.2);
      CTX.lineTo(x+w*0.5+cw*0.15,y+h*0.5+ch*0.5);
      CTX.lineTo(x+w*0.5-cw*0.15,y+h*0.5+ch*0.5);
      CTX.lineTo(x+w*0.5-cw*0.3,y+h*0.5+ch*0.2);
      CTX.closePath();
      CTX.fill();
      // Highlight
      CTX.fillStyle = 'rgba(255,240,255,0.4)';
      CTX.beginPath();
      CTX.moveTo(x+w*0.5,y+h*0.5-ch*0.45);
      CTX.lineTo(x+w*0.5+cw*0.1,y+h*0.5);
      CTX.lineTo(x+w*0.5-cw*0.05,y+h*0.5+ch*0.1);
      CTX.closePath();
      CTX.fill();
      break;
    case 'rock_lg':
    case 'rock':
      const rw = obj.type==='rock_lg'?w:w*0.7;
      const rh = obj.type==='rock_lg'?h*0.6:h*0.5;
      CTX.fillStyle = '#b0a898';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5, y+h-rh*0.5, rw*0.5, rh*0.5, 0, 0, Math.PI*2);
      CTX.fill();
      CTX.fillStyle = 'rgba(200,192,180,0.5)';
      CTX.beginPath();
      CTX.ellipse(x+w*0.45, y+h-rh*0.6, rw*0.25, rh*0.25, -0.3, 0, Math.PI*2);
      CTX.fill();
      break;
    case 'star_altar':
      // Platform
      CTX.fillStyle = '#d0c0d8';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5,y+h*0.7,w*0.5,h*0.2,0,0,Math.PI*2);
      CTX.fill();
      // Pillar
      CTX.fillStyle = '#c0b0c8';
      CTX.fillRect(x+w*0.35,y+h*0.2, w*0.3, h*0.5);
      // Star glow
      const sg = 0.3+Math.sin(GS.time*0.002)*0.3;
      CTX.globalAlpha = sg;
      CTX.fillStyle = '#f0d8f0';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5,y+h*0.15,w*0.3,h*0.15,0,0,Math.PI*2);
      CTX.fill();
      CTX.globalAlpha = 1;
      // Star
      drawStar(x+w*0.5,y+h*0.15,5,10,5,'#f0c0e0');
      break;
    case 'telescope':
      CTX.fillStyle = '#a09088';
      CTX.fillRect(x+w*0.45,y+h*0.3,w*0.1,h*0.7);
      CTX.fillStyle = '#8878a0';
      CTX.save();
      CTX.translate(x+w*0.5,y+h*0.3);
      CTX.rotate(-0.5);
      CTX.fillRect(-3,-20,6,20);
      CTX.restore();
      break;
    case 'well':
      CTX.fillStyle = '#c0b0a0';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5,y+h*0.6,w*0.4,h*0.2,0,0,Math.PI*2);
      CTX.fill();
      CTX.fillStyle = '#80b8d0';
      CTX.beginPath();
      CTX.ellipse(x+w*0.5,y+h*0.58,w*0.3,h*0.12,0,0,Math.PI*2);
      CTX.fill();
      CTX.strokeStyle = '#a09080';
      CTX.lineWidth = 2;
      CTX.beginPath();
      CTX.moveTo(x+w*0.3,y+h*0.5); CTX.lineTo(x+w*0.3,y+h*0.15);
      CTX.lineTo(x+w*0.7,y+h*0.15); CTX.lineTo(x+w*0.7,y+h*0.5);
      CTX.stroke();
      break;
    case 'mushroom':
    case 'mushroom_cluster':
      const mc = obj.type==='mushroom_cluster'?3:1;
      for(let i=0;i<mc;i++){
        const mx = x+w*0.5+(i-1)*10;
        const my = y+h*0.6-i*5;
        const ms = 1-i*0.15;
        CTX.fillStyle = '#e8d8c0';
        CTX.fillRect(mx-2*ms,my,4*ms,12*ms);
        CTX.fillStyle = ['#e8a0a0','#d0a0d0','#a0c8d0'][i%3];
        CTX.beginPath();
        CTX.ellipse(mx,my,9*ms,7*ms,0,Math.PI,0);
        CTX.fill();
        // Dots
        CTX.fillStyle = 'rgba(255,255,255,0.5)';
        CTX.beginPath(); CTX.arc(mx-3*ms,my-3*ms,1.5,0,Math.PI*2); CTX.fill();
        CTX.beginPath(); CTX.arc(mx+2*ms,my-4*ms,1,0,Math.PI*2); CTX.fill();
      }
      break;
    case 'flower_patch':
      for(let i=0;i<5;i++){
        const fpx = x+8+i*8;
        const fpy = y+h*0.5+Math.sin(i*2)*5+bob*0.5;
        const fc = ['#f0a0b8','#f0c878','#d0a0f0','#a0d8f0','#f0b0a0'][i];
        // Stem
        CTX.strokeStyle = '#80b870';
        CTX.lineWidth = 1.5;
        CTX.beginPath(); CTX.moveTo(fpx,fpy); CTX.lineTo(fpx,fpy+12); CTX.stroke();
        // Petals
        CTX.fillStyle = fc;
        for(let p=0;p<5;p++){
          const pa = p*Math.PI*2/5 + GS.time*0.001;
          CTX.beginPath();
          CTX.ellipse(fpx+Math.cos(pa)*4,fpy+Math.sin(pa)*4,3,2,pa,0,Math.PI*2);
          CTX.fill();
        }
        CTX.fillStyle = '#f8e878';
        CTX.beginPath(); CTX.arc(fpx,fpy,2,0,Math.PI*2); CTX.fill();
      }
      break;
    case 'bookshelf':
      CTX.fillStyle = obj.color || '#8B6050';
      CTX.fillRect(x+2,y+2,w-4,h-4);
      CTX.strokeStyle='rgba(0,0,0,0.15)'; CTX.lineWidth=1;
      for(let i=0;i<4;i++){ CTX.beginPath(); CTX.moveTo(x+2+i*(w-4)/4,y+2); CTX.lineTo(x+2+i*(w-4)/4,y+h-4); CTX.stroke(); }
      CTX.fillStyle='rgba(200,160,120,0.6)';
      for(let i=0;i<3;i++) CTX.fillRect(x+4+i*((w-8)/3),y+4,((w-8)/3)-2,h-12);
      break;
    case 'bed':
      CTX.fillStyle='#C8A878'; CTX.fillRect(x+2,y+2,w-4,h*0.35);
      CTX.fillStyle=obj.color||'#90B8D8'; CTX.fillRect(x+2,y+h*0.35,w-4,h*0.55);
      CTX.fillStyle='#F5EAD5'; CTX.fillRect(x+2,y+4,w*0.45,h*0.25);
      break;
    case 'desk': case 'table': case 'counter':
      CTX.fillStyle=obj.color||'#C8A878';
      CTX.fillRect(x+2,y+4,w-4,h*0.4);
      CTX.fillStyle='rgba(0,0,0,0.1)';
      CTX.fillRect(x+2,y+h*0.45,4,h*0.5);
      CTX.fillRect(x+w-6,y+h*0.45,4,h*0.5);
      if(obj.label){ CTX.fillStyle='#805050'; CTX.font='8px sans-serif'; CTX.textAlign='center'; CTX.fillText(obj.label,x+w*0.5,y+h*0.3); CTX.textAlign='left'; }
      break;
    case 'chair':
      CTX.fillStyle=obj.color||'#B09870';
      CTX.fillRect(x+2,y+h*0.5,w-4,h*0.4);
      CTX.fillRect(x+4,y+h*0.2,w-8,h*0.32);
      break;
    case 'wardrobe':
      CTX.fillStyle=obj.color||'#8898C8';
      CTX.fillRect(x+2,y+2,w-4,h-4);
      CTX.strokeStyle='rgba(255,255,255,0.2)'; CTX.lineWidth=1;
      CTX.beginPath(); CTX.moveTo(x+w/2,y+2); CTX.lineTo(x+w/2,y+h-4); CTX.stroke();
      CTX.fillStyle='rgba(255,255,255,0.15)'; CTX.beginPath(); CTX.arc(x+w*0.35,y+h*0.55,2,0,Math.PI*2); CTX.fill();
      CTX.beginPath(); CTX.arc(x+w*0.65,y+h*0.55,2,0,Math.PI*2); CTX.fill();
      break;
    case 'chest': case 'crate':
      CTX.fillStyle=obj.color||'#C09060';
      CTX.fillRect(x+2,y+4,w-4,h-6);
      CTX.strokeStyle='rgba(0,0,0,0.2)'; CTX.lineWidth=1;
      CTX.beginPath(); CTX.moveTo(x+2,y+h*0.5); CTX.lineTo(x+w-2,y+h*0.5); CTX.stroke();
      CTX.fillStyle='#D4A870'; CTX.beginPath(); CTX.arc(x+w*0.5,y+h*0.5,3,0,Math.PI*2); CTX.fill();
      break;
    case 'shelf':
      CTX.fillStyle=obj.color||'#B89060';
      CTX.fillRect(x+2,y+4,w-4,8);
      CTX.fillStyle='rgba(0,0,0,0.1)'; CTX.fillRect(x+2,y+12,w-4,3);
      if(obj.label){ CTX.fillStyle='#705040'; CTX.font='7px sans-serif'; CTX.textAlign='center'; CTX.fillText(obj.label,x+w*0.5,y+10); CTX.textAlign='left'; }
      break;
    case 'fireplace':
      CTX.fillStyle='#908080'; CTX.fillRect(x+2,y+4,w-4,h-6);
      CTX.fillStyle='#202020'; CTX.fillRect(x+6,y+h*0.4,w-12,h*0.5);
      CTX.globalAlpha=0.8+Math.sin(GS.time*0.008)*0.2;
      CTX.fillStyle='#FF6020'; CTX.beginPath(); CTX.moveTo(x+w*0.3,y+h-4); CTX.lineTo(x+w*0.5,y+h*0.45); CTX.lineTo(x+w*0.7,y+h-4); CTX.fill();
      CTX.fillStyle='#FFB020'; CTX.beginPath(); CTX.moveTo(x+w*0.38,y+h-4); CTX.lineTo(x+w*0.5,y+h*0.55); CTX.lineTo(x+w*0.62,y+h-4); CTX.fill();
      CTX.globalAlpha=1;
      break;
    case 'telescope_big': case 'star_chart':
      CTX.fillStyle=obj.color||'#907898';
      CTX.fillRect(x+4,y+8,w-8,h-10);
      CTX.fillStyle='rgba(200,180,240,0.3)'; CTX.fillRect(x+6,y+10,w-12,h-14);
      if(obj.type==='star_chart'){
        CTX.fillStyle='rgba(255,255,200,0.6)';
        for(let i=0;i<6;i++) { CTX.beginPath(); CTX.arc(x+8+Math.random()*8*(w/16),y+12+Math.random()*6,1.2,0,Math.PI*2); CTX.fill(); }
      }
      break;
    case 'crystal_sm':
      CTX.fillStyle=obj.color||'#C0B0E0';
      CTX.beginPath(); CTX.moveTo(x+w*0.5,y+4); CTX.lineTo(x+w-4,y+h*0.6); CTX.lineTo(x+w*0.5,y+h-4); CTX.lineTo(x+4,y+h*0.6); CTX.closePath(); CTX.fill();
      CTX.globalAlpha=0.4; CTX.fillStyle='#fff'; CTX.beginPath(); CTX.moveTo(x+w*0.5,y+6); CTX.lineTo(x+w*0.65,y+h*0.4); CTX.lineTo(x+w*0.5,y+h*0.35); CTX.closePath(); CTX.fill(); CTX.globalAlpha=1;
      break;
    case 'lamp_post':{
      // Base
      CTX.fillStyle='#8A7A60';
      CTX.fillRect(x+w*0.42,y+h*0.55,w*0.16,h*0.45);
      // Post
      CTX.fillStyle='#6A6050';
      CTX.fillRect(x+w*0.45,y+h*0.1,w*0.1,h*0.5);
      // Lamp head
      CTX.fillStyle='#D4B860';
      CTX.beginPath(); CTX.arc(x+w*0.5,y+h*0.1,w*0.22,0,Math.PI*2); CTX.fill();
      // Glow
      const lpGlow=CTX.createRadialGradient(x+w*0.5,y+h*0.1,0,x+w*0.5,y+h*0.1,w*0.55);
      const night=GS.dayTime>0.55||GS.dayTime<0.2;
      lpGlow.addColorStop(0,night?'rgba(255,220,100,0.55)':'rgba(255,220,100,0.18)');
      lpGlow.addColorStop(1,'rgba(255,220,100,0)');
      CTX.fillStyle=lpGlow;
      CTX.beginPath(); CTX.arc(x+w*0.5,y+h*0.1,w*0.55,0,Math.PI*2); CTX.fill();
      break;
    }
    case 'flower_pot':{
      // Pot body
      CTX.fillStyle='#C0784A';
      CTX.beginPath();
      CTX.moveTo(x+w*0.2,y+h*0.9); CTX.lineTo(x+w*0.8,y+h*0.9);
      CTX.lineTo(x+w*0.72,y+h*0.5); CTX.lineTo(x+w*0.28,y+h*0.5); CTX.closePath();
      CTX.fill();
      // Pot rim
      CTX.fillStyle='#D08858';
      CTX.fillRect(x+w*0.18,y+h*0.48,w*0.64,h*0.08);
      // Soil
      CTX.fillStyle='#6A4828';
      CTX.beginPath(); CTX.ellipse(x+w*0.5,y+h*0.5,w*0.26,h*0.07,0,0,Math.PI*2); CTX.fill();
      // Flowers
      const fpColors=['#D48FA0','#F2C46D','#BBA8D9','#8FA8D6'];
      for(let fi=0;fi<3;fi++){
        const fc=fpColors[fi%fpColors.length];
        const fsx=x+w*(0.28+fi*0.22), fsy=y+h*(0.3+Math.sin(fi)*0.05);
        const fsh=h*0.22;
        CTX.strokeStyle='#5A7A40'; CTX.lineWidth=1.5;
        CTX.beginPath(); CTX.moveTo(fsx,y+h*0.5); CTX.lineTo(fsx,fsy+fsh); CTX.stroke();
        CTX.fillStyle=fc; CTX.globalAlpha=0.9;
        CTX.beginPath(); CTX.arc(fsx,fsy,w*0.12,0,Math.PI*2); CTX.fill();
        CTX.fillStyle='#F5EAD5'; CTX.globalAlpha=1;
        CTX.beginPath(); CTX.arc(fsx,fsy,w*0.05,0,Math.PI*2); CTX.fill();
      }
      CTX.globalAlpha=1;
      break;
    }
    default:
      // Generic fallback
      CTX.fillStyle = 'rgba(180,160,150,0.4)';
      CTX.fillRect(x,y,w,h);
      break;
  }
}

function drawStar(cx,cy,spikes,outerR,innerR,color){
  CTX.fillStyle = color;
  CTX.beginPath();
  for(let i=0;i<spikes*2;i++){
    const r = i%2===0?outerR:innerR;
    const a = -Math.PI/2 + i*Math.PI/spikes;
    if(i===0) CTX.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    else CTX.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
  }
  CTX.closePath();
  CTX.fill();
}
