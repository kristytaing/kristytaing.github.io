// ── Part 4: Item & Player Rendering ──────────────────────
function renderItem(item, camX, camY){
  if(item.taken) return;
  const x = item.x - camX;
  const y = item.y - camY;
  const bob = Math.sin(GS.time*0.004 + item.x)*4;
  const glow = 0.3 + Math.sin(GS.time*0.003 + item.x*0.5)*0.2;
  // Glow ring
  CTX.globalAlpha = glow;
  CTX.fillStyle = item.crystal ? '#e0c0f0' : '#f0e0a0';
  CTX.beginPath();
  CTX.ellipse(x+16, y+20, 14, 6, 0, 0, Math.PI*2);
  CTX.fill();
  CTX.globalAlpha = 1;
  // Item body
  if(item.crystal){
    // Crystal
    CTX.fillStyle = '#c8a0e8';
    CTX.beginPath();
    CTX.moveTo(x+16, y+bob+4);
    CTX.lineTo(x+22, y+bob+14);
    CTX.lineTo(x+19, y+bob+22);
    CTX.lineTo(x+13, y+bob+22);
    CTX.lineTo(x+10, y+bob+14);
    CTX.closePath();
    CTX.fill();
    // Sparkle
    CTX.fillStyle = 'rgba(255,240,255,0.6)';
    CTX.beginPath();
    CTX.moveTo(x+16, y+bob+6); CTX.lineTo(x+18, y+bob+12); CTX.lineTo(x+14, y+bob+10);
    CTX.closePath();
    CTX.fill();
  } else {
    // Generic item icon
    CTX.font = '18px sans-serif';
    CTX.textAlign = 'center';
    CTX.fillText(item.icon||'✦', x+16, y+bob+18);
    CTX.textAlign = 'left';
  }
  // Label on approach
  const px = GS.player.x, py = GS.player.y;
  if(dist(px,py,item.x,item.y) < 60){
    CTX.fillStyle = 'rgba(255,245,250,0.9)';
    CTX.font = '10px sans-serif';
    const tw = CTX.measureText(item.item).width;
    CTX.fillRect(x+16-tw*0.5-4, y+bob-6, tw+8, 14);
    CTX.fillStyle = '#805070';
    CTX.textAlign = 'center';
    CTX.fillText(item.item, x+16, y+bob+5);
    CTX.textAlign = 'left';
  }
}

// ── Player Character (Canvas 2D) ─────────────────────────
function renderPlayer(camX, camY){
  const p = GS.player;
  const x = p.x - camX;
  const y = p.y - camY;
  const dir = p.dir;
  const walking = p.walking;
  const frame = p.walkFrame;
  const bounce = walking ? Math.sin(frame*0.3)*1.5 : 0;
  const skin = '#F2C9A0';
  const hair = '#7a5030';
  const shirt = '#8FA8D6';
  const pants = '#3D2B5E';
  const shoe = '#5a3a28';

  CTX.save();
  CTX.translate(x+16, y+30+bounce);

  // Shadow
  CTX.fillStyle = 'rgba(0,0,0,0.10)';
  CTX.beginPath();
  CTX.ellipse(0,2,9,3,0,0,Math.PI*2);
  CTX.fill();

  // Legs
  const ls = walking ? Math.sin(frame*0.3)*4 : 0;
  // Left leg
  CTX.fillStyle = pants;
  CTX.beginPath();
  CTX.roundRect(-6,-4, 5, 10, 2);
  CTX.fill();
  // Right leg
  CTX.beginPath();
  CTX.roundRect(1,-4, 5, 10, 2);
  CTX.fill();
  // Shoes
  CTX.fillStyle = shoe;
  CTX.beginPath(); CTX.ellipse(-3.5+ls*0.3, 7, 4.5, 2.5, 0,0,Math.PI*2); CTX.fill();
  CTX.beginPath(); CTX.ellipse(3.5-ls*0.3, 7, 4.5, 2.5, 0,0,Math.PI*2); CTX.fill();

  // Body / shirt
  CTX.fillStyle = shirt;
  CTX.beginPath();
  CTX.roundRect(-8,-14, 16, 12, 3);
  CTX.fill();

  // Arms
  const as2 = walking ? Math.sin(frame*0.3)*3 : 0;
  CTX.fillStyle = shirt;
  CTX.beginPath(); CTX.roundRect(-13,-13+as2*0.3, 6, 9, 3); CTX.fill();
  CTX.beginPath(); CTX.roundRect(7,-13-as2*0.3, 6, 9, 3); CTX.fill();
  // Hands
  CTX.fillStyle = skin;
  CTX.beginPath(); CTX.arc(-10, -3+as2*0.3, 3, 0,Math.PI*2); CTX.fill();
  CTX.beginPath(); CTX.arc(10, -3-as2*0.3, 3, 0,Math.PI*2); CTX.fill();

  // Neck
  CTX.fillStyle = skin;
  CTX.beginPath(); CTX.roundRect(-3,-18,6,6,2); CTX.fill();

  // Back hair (behind head)
  CTX.fillStyle = hair;
  CTX.beginPath();
  CTX.ellipse(0,-26,11,9,0,0,Math.PI*2);
  CTX.fill();
  // Hair that hangs down sides
  CTX.beginPath();
  CTX.moveTo(-10,-26); CTX.quadraticCurveTo(-13,-20,-11,-14); CTX.lineTo(-8,-14); CTX.quadraticCurveTo(-9,-20,-7,-26); CTX.closePath();
  CTX.fill();
  CTX.beginPath();
  CTX.moveTo(10,-26); CTX.quadraticCurveTo(13,-20,11,-14); CTX.lineTo(8,-14); CTX.quadraticCurveTo(9,-20,7,-26); CTX.closePath();
  CTX.fill();

  // Head
  CTX.fillStyle = skin;
  CTX.beginPath();
  CTX.ellipse(0,-26,10,10,0,0,Math.PI*2);
  CTX.fill();

  // Face (only when not facing away)
  if(dir !== 2){
    const faceDir = dir===1?-1:dir===3?1:0;
    const blinkCycle = Math.floor(GS.time/5000)%60;
    const isBlinking = blinkCycle===0 && (GS.time%5000)<100;

    // Eyes — small, simple dot-style
    [-4.5, 4.5].forEach((ex, i) => {
      const eyeX = ex + faceDir*1.2;
      const eyeY = -27;
      if(isBlinking){
        CTX.strokeStyle='#4a3828'; CTX.lineWidth=1.5;
        CTX.beginPath(); CTX.arc(eyeX, eyeY, 2, Math.PI,0); CTX.stroke();
      } else {
        // Simple eye: white + small iris + pupil
        CTX.fillStyle='#fff';
        CTX.beginPath(); CTX.ellipse(eyeX,eyeY,2.8,2.8,0,0,Math.PI*2); CTX.fill();
        CTX.fillStyle='#5060a0';
        CTX.beginPath(); CTX.ellipse(eyeX+faceDir*0.5,eyeY,1.8,1.8,0,0,Math.PI*2); CTX.fill();
        CTX.fillStyle='#1a1828';
        CTX.beginPath(); CTX.ellipse(eyeX+faceDir*0.5,eyeY,1,1,0,0,Math.PI*2); CTX.fill();
        CTX.fillStyle='rgba(255,255,255,0.9)';
        CTX.beginPath(); CTX.arc(eyeX+faceDir*0.3+0.8,eyeY-0.8,0.8,0,Math.PI*2); CTX.fill();
      }
    });

    // Blush — very subtle
    CTX.fillStyle='rgba(220,140,140,0.18)';
    CTX.beginPath(); CTX.ellipse(-6+faceDir,-24,3,1.5,0,0,Math.PI*2); CTX.fill();
    CTX.beginPath(); CTX.ellipse(6+faceDir,-24,3,1.5,0,0,Math.PI*2); CTX.fill();

    // Mouth — simple small curve
    CTX.strokeStyle='rgba(160,90,90,0.7)'; CTX.lineWidth=1.2; CTX.lineCap='round';
    CTX.beginPath(); CTX.arc(faceDir,-22,2.5,0.2,Math.PI-0.2); CTX.stroke();
  }

  // Top hair — flat cap shape
  CTX.fillStyle = hair;
  CTX.beginPath();
  CTX.ellipse(0,-33,10,5,0,Math.PI,0);
  CTX.fill();
  // Fringe — simple horizontal band, stays above eyes
  CTX.beginPath();
  CTX.moveTo(-9,-31); CTX.quadraticCurveTo(-5,-27,0,-27); CTX.quadraticCurveTo(5,-27,9,-31);
  CTX.closePath(); CTX.fill();

  CTX.restore();
}
