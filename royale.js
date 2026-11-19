/* NOVA CITY: original, offline 2D survival-arena prototype. */
(() => {
  const W = 1500, H = 1120, BOT_COUNT = 7, MATCH_SECONDS = 105;
  const MAP_CENTER = { x: 755, y: 560 };
  let blockers = [
    {x:175,y:135,w:182,h:112,c:'#967b5d',roof:'#546d4e',label:'ร้านยา'}, {x:1090,y:145,w:222,h:125,c:'#b59365',roof:'#8b5948',label:'คลังของ'},
    {x:180,y:800,w:210,h:130,c:'#a99370',roof:'#5b7754',label:'บ้านพัก'}, {x:1100,y:795,w:205,h:150,c:'#948768',roof:'#667c61',label:'โรงนา'},
    {x:565,y:218,w:168,h:94,c:'#a8956e',roof:'#8b6748',label:'จุดพัก'}, {x:815,y:830,w:178,h:112,c:'#9c8963',roof:'#536f4e',label:'ที่กำบัง'},
    {x:470,y:555,w:98,h:56,c:'#7b7059',roof:'#4d6250',label:'ซาก'}, {x:958,y:525,w:92,h:68,c:'#897858',roof:'#4e6751',label:'ซาก'}
  ];
  const trees = [];
  for(let y=65;y<H;y+=108) for(let x=55;x<W;x+=119){
    const r=Math.sin(x*2.31+y*5.17);
    if(r>.15 && !blockers.some(b=>x>b.x-40&&x<b.x+b.w+40&&y>b.y-45&&y<b.y+b.h+45)) trees.push({x:x+(r*13),y:y+((r*9)|0),r:15+Math.abs(r*7)});
  }
  const roads=[{x:0,y:470,w:W,h:100},{x:695,y:0,w:110,h:H},{x:230,y:260,w:830,h:56},{x:352,y:710,w:870,h:53}];
  let root, canvas, ctx, mini, mctx, Wp=0, Hp=0, dpr=1, zoom=1, raf=0, last=0, toastTimer=0, state=null;
  const keys=new Set(), pointers=new Map();
  const keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};

  if (window.zoneInfo && window.zoneInfo.battle) {
    zoneInfo.battle={kicker:'โหมดเอาตัวรอด • เล่นคนเดียว',title:'สมรภูมิ<br>วงสุดท้าย',text:'ลงสนาม เก็บกระสุนและชุดพยาบาล หลบศัตรู AI แล้วอยู่รอดจนวงปลอดภัยปิดเกม',button:'เข้าสนาม'};
  }
  const battleZone=document.querySelector('.zone[data-zone="battle"]');
  if(battleZone){const sub=battleZone.querySelector('span');if(sub)sub.textContent='เก็บของ • สู้ AI • วงปลอดภัย';}

  // Route the existing NOVA CITY battle button to this original solo mode.
  window.enterZone=function(){
    if(typeof currentZone!=='undefined'&&currentZone==='battle'){openRoyale();return;}
    if(typeof currentZone!=='undefined'&&currentZone==='social'){openChat();return;}
    if(typeof currentZone!=='undefined'&&currentZone==='home'){showModal('บ้านและรถ','เดินสำรวจบ้านและรถในเมือง 2D ได้ ส่วนโหมดนี้เป็นสนามเอาตัวรอดเดี่ยว','เข้าใจแล้ว');return;}
    openCityScene();
  };

  function loadCustomArena(){
    try {
      const saved = JSON.parse(localStorage.getItem('nova-city-built-arena-v1') || 'null');
      if (!saved || saved.custom !== true || !Array.isArray(saved.walls)) return;
      const cellH = H / 11;
      blockers = saved.walls.map(w => ({ x: w.x * 100 + 18, y: w.y * cellH + 16, w: 64, h: Math.max(48, cellH - 30), c: w.tool === 'crate' ? '#b9934d' : w.tool === 'bush' ? '#47754e' : '#78614b', roof: w.tool === 'bush' ? '#315d3a' : '#536c4a', label: w.tool === 'crate' ? 'ลัง' : w.tool === 'bush' ? 'พุ่ม' : 'กำบัง' }));
    } catch (_) {}
  }
  function openRoyale(){
    loadCustomArena();
    if(document.getElementById('royaleGame')){showLobby();return;}
    root=document.createElement('section');root.id='royaleGame';root.className='royale-game';
    root.innerHTML=`<canvas id="royaleCanvas" aria-label="สนามเอาตัวรอด NOVA CITY"></canvas><div class="royale-shade"></div>
      <div class="royale-hud hidden" id="royaleHud"><div class="royale-top"><button id="royaleExit">← ออก</button><div class="royale-stats"><div class="royale-pill">👥 เหลือ <b id="royaleAlive">11</b></div><div class="royale-pill royale-zone-timer">◉ วง <b id="royaleClock">01:45</b></div><div class="royale-pill">🔫 <b id="royaleAmmo">24</b></div></div><button id="royaleMapBtn">แผนที่</button></div>
      <div class="royale-health"><div class="royale-health-label"><span>พลังชีวิต</span><b id="royaleHpLabel">100%</b></div><div class="royale-health-track"><i id="royaleHpBar"></i></div></div>
      <div class="royale-minimap"><canvas id="royaleMini" width="188" height="188" aria-label="แผนที่ย่อ"></canvas></div>
      <div class="royale-toast" id="royaleToast"></div><div class="royale-bottom-info" id="royaleHint"><span>ภารกิจ</span> อยู่รอดให้ครบเวลา<br>แตะกล่องเพื่อเก็บของ</div>
      <div class="royale-aim">ปุ่มยิงเล็งศัตรูใกล้สุดอัตโนมัติ</div></div>
      <div class="royale-controls hidden" id="royaleControls"><div class="royale-pad" aria-label="ปุ่มเดิน"><button class="up" data-dir="up" aria-label="เดินขึ้น">▲</button><button class="left" data-dir="left" aria-label="เดินซ้าย">◀</button><button class="down" data-dir="down" aria-label="เดินลง">▼</button><button class="right" data-dir="right" aria-label="เดินขวา">▶</button></div><div class="royale-action-wrap"><button class="royale-action" id="royaleFire" aria-label="ยิงค้างเพื่อยิงศัตรูใกล้สุด">ยิง</button><span class="royale-action-hint">เล็งอัตโนมัติ</span></div></div>
      <div class="royale-lobby" id="royaleLobby"><div class="royale-lobby-card"><div class="royale-brand">NOVA CITY · SOLO SURVIVAL</div><h1>เกาะรอยต่อ<br>เอาตัวรอดให้ถึงวงสุดท้าย</h1><p>สนามใหม่ของ NOVA CITY เป็นเกม 2D มุมมองด้านบน: เดินหาของ เก็บกระสุนและชุดพยาบาล ต่อสู้กับคู่แข่ง AI และรีบเข้าวงปลอดภัยที่ค่อย ๆ หดเล็กลง</p><div class="royale-map-card"></div><div class="royale-lobby-meta"><div class="royale-meta"><strong>8 คน</strong><small>คุณ + AI 7 คน</small></div><div class="royale-meta"><strong>1:45 นาที</strong><small>รอบสั้นสำหรับทดลอง</small></div><div class="royale-meta"><strong>ฟรี</strong><small>ไม่มีซื้อของในเกม</small></div></div><p class="royale-controls-copy">มือถือ: ใช้ปุ่มลูกศรซ้ายล่างเดิน กดค้างปุ่มยิงขวาล่างเพื่อเล็งอัตโนมัติ · เดินชิดกล่องเพื่อเก็บของ · คอมพิวเตอร์ใช้ปุ่ม WASD / ลูกศร และ Space เพื่อยิง</p><div class="royale-lobby-actions"><button class="royale-start" id="royaleStart">เริ่มลงสนาม ↗</button><button class="royale-return" id="royaleReturn">กลับเมือง</button></div><section class="royale-room" aria-label="โครงร่างห้องออนไลน์ตัวอย่าง"><div class="royale-room-title">👥 เล่นกับเพื่อน <small>โครงร่างห้องออนไลน์</small></div><p>เตรียมทางไว้สำหรับสร้างห้องหรือใส่รหัสเพื่อเข้าร่วม แต่ตอนนี้ยังเป็นหน้าจอตัวอย่างบนเครื่องนี้ ยังเชื่อมผู้เล่นคนอื่นไม่ได้</p><div class="royale-room-actions"><button id="royaleCreateRoom" type="button">สร้างห้องตัวอย่าง</button><div class="royale-join-row"><input id="royaleRoomInput" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="รหัสห้อง 6 หลัก" aria-label="รหัสห้อง 6 หลัก"><button id="royaleJoinRoom" type="button">เข้าห้อง</button></div></div><div class="royale-room-code" id="royaleRoomResult" hidden>รหัสห้องตัวอย่าง: <b id="royaleRoomCode"></b><small>รหัสนี้ยังแชร์ไปเชื่อมกับคนจริงไม่ได้</small></div></section><p class="royale-disclaimer">เดโมเล่นคนเดียว · คู่แข่งทั้งหมดเป็น AI · ไม่มีผู้เล่นออนไลน์จริง</p></div></div>
      <div class="royale-result hidden" id="royaleResult"><div class="royale-result-card"><div class="royale-result-icon" id="royaleResultIcon">🏆</div><h2 id="royaleResultTitle">อยู่รอดสำเร็จ!</h2><p id="royaleResultText"></p><div class="royale-result-actions"><button id="royaleAgain">ลงสนามอีกครั้ง</button><button id="royaleToCity">กลับหน้าเมือง</button></div></div></div>`;
    document.body.appendChild(root);
    canvas=document.getElementById('royaleCanvas');ctx=canvas.getContext('2d');mini=document.getElementById('royaleMini');mctx=mini.getContext('2d');
    resize();window.addEventListener('resize',resize);window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',clearInput);window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',pointerUp);
    canvas.addEventListener('pointerdown',mapTap);
    document.querySelectorAll('.royale-pad button').forEach(b=>{b.addEventListener('pointerdown',pointerDown);b.addEventListener('pointerup',pointerUp);b.addEventListener('pointercancel',pointerUp);});
    document.getElementById('royaleFire').addEventListener('pointerdown',pointerDown);document.getElementById('royaleFire').addEventListener('pointerup',pointerUp);document.getElementById('royaleFire').addEventListener('pointercancel',pointerUp);
    document.getElementById('royaleExit').onclick=showLobby;document.getElementById('royaleMapBtn').onclick=()=>toast('แผนที่ย่อแสดงวงปลอดภัยและตำแหน่ง AI');
    document.getElementById('royaleStart').onclick=startMatch;document.getElementById('royaleReturn').onclick=closeRoyale;document.getElementById('royaleAgain').onclick=startMatch;document.getElementById('royaleToCity').onclick=closeRoyale;document.getElementById('royaleCreateRoom').onclick=createDemoRoom;document.getElementById('royaleJoinRoom').onclick=joinDemoRoom;
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    raf=requestAnimationFrame(loop);
  }
  function closeRoyale(){
    if(!root)return;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clearInput);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',pointerUp);root.remove();root=null;state=null;clearInput();
  }
  function showLobby(){
    if(!root)return;state=null;clearInput();document.getElementById('royaleLobby').classList.remove('hidden');document.getElementById('royaleHud').classList.add('hidden');document.getElementById('royaleControls').classList.add('hidden');document.getElementById('royaleResult').classList.add('hidden');
  }
  function resize(){
    if(!canvas)return;dpr=Math.min(devicePixelRatio||1,2);Wp=innerWidth;Hp=innerHeight;canvas.width=Math.round(Wp*dpr);canvas.height=Math.round(Hp*dpr);zoom=Math.max(.42,Math.min(.9,Wp/900,Hp/930));
    const box=document.querySelector('.royale-minimap');if(box)mini.width=mini.height=Math.round(Math.min(box.clientWidth*2,240));
  }
  function keyDown(e){const d=keyMap[e.key];if(d){e.preventDefault();keys.add(d);}if(e.code==='Space'){e.preventDefault();keys.add('fire');}}
  function keyUp(e){const d=keyMap[e.key];if(d)keys.delete(d);if(e.code==='Space')keys.delete('fire');}
  function clearInput(){keys.clear();pointers.clear();document.querySelectorAll('.royale-pad .pressed,.royale-action.pressed').forEach(x=>x.classList.remove('pressed'));}
  function pointerDown(e){e.preventDefault();const type=e.currentTarget.dataset.dir||'fire';pointers.set(e.pointerId,type);e.currentTarget.classList.add('pressed');try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){} }
  function pointerUp(e){const type=pointers.get(e.pointerId);if(type){pointers.delete(e.pointerId);const el=type==='fire'?document.getElementById('royaleFire'):document.querySelector(`.royale-pad button[data-dir="${type}"]`);if(el)el.classList.remove('pressed');}}
  function mapTap(e){if(!state||!state.live||e.target!==canvas)return;const r=canvas.getBoundingClientRect(),wx=state.player.x+(e.clientX-r.left-Wp/2)/zoom,wy=state.player.y+(e.clientY-r.top-Hp/2)/zoom;state.target={x:clamp(wx,30,W-30),y:clamp(wy,30,H-30)};}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  let demoRoomCode='';
  function createDemoRoom(){demoRoomCode=String(100000+Math.floor(Math.random()*900000));document.getElementById('royaleRoomCode').textContent=demoRoomCode;document.getElementById('royaleRoomResult').hidden=false;toast('สร้างรหัสห้องตัวอย่างแล้ว — ยังไม่มีการเชื่อมออนไลน์');}
  function joinDemoRoom(){const code=(document.getElementById('royaleRoomInput').value||'').replace(/\D/g,'');if(code.length!==6){toast('ใส่รหัสตัวอย่างให้ครบ 6 หลัก');return;}toast(code===demoRoomCode?'รหัสตัวอย่างตรงกัน แต่ยังไม่เชื่อมกับผู้เล่นจริง':'หน้ารับรหัสพร้อมแล้ว — ระบบห้องจริงยังไม่เปิด');}
  function startMatch(){
    document.getElementById('royaleLobby').classList.add('hidden');document.getElementById('royaleResult').classList.add('hidden');document.getElementById('royaleHud').classList.remove('hidden');document.getElementById('royaleControls').classList.remove('hidden');clearInput();
    const p={x:MAP_CENTER.x+15,y:MAP_CENTER.y+42,hp:100,ammo:24,angle:-Math.PI/2,shoot:0};
    const bots=[];for(let i=0;i<BOT_COUNT;i++){const a=(Math.PI*2*i/BOT_COUNT)+Math.random()*.3,r=260+Math.random()*260;let b={x:MAP_CENTER.x+Math.cos(a)*r,y:MAP_CENTER.y+Math.sin(a)*r,hp:78,walk:Math.random()*8,fire:1.5+Math.random()*2.0,turn:Math.random()*3.4,wander:3+Math.random()*4,color:['#ee8359','#d55f69','#c8894c','#dc6f54'][i%4],id:i};if(blocked(b.x,b.y,19)){b.x=MAP_CENTER.x+Math.cos(a)*340;b.y=MAP_CENTER.y+Math.sin(a)*340;}bots.push(b);}
    const allies=Array.from({length:3},(_,i)=>({x:p.x-54+36*i,y:p.y+52,hp:100,walk:Math.random()*6,fire:.6+i*.4,id:i,color:['#55c4a3','#79a9dc','#d79cc5'][i]}));
    const loot=[];for(let i=0;i<22;i++){let x=60+Math.random()*(W-120),y=60+Math.random()*(H-120);if(blocked(x,y,22)){x=60+(i*173)%1360;y=60+(i*257)%1000;}loot.push({x,y,type:i%3===0?'med':'ammo',bob:Math.random()*7});}
    state={player:p,bots,allies,bullets:[],foeShots:[],loot,elapsed:0,time:MATCH_SECONDS,zone:{x:MAP_CENTER.x,y:MAP_CENTER.y,r:525,startR:525,endR:102,delay:14,shrink:73},kills:0,live:true,shotCooldown:0,lastUi:0,target:null};
    updateHud();toast('ลงสนามแล้ว — เก็บของใกล้กล่องสีทอง');
  }
  function blocked(x,y,r=14){if(x<r+9||x>W-r-9||y<r+9||y>H-r-9)return true;return blockers.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);}
  function moveEntity(e,dx,dy,dt,r=14){const nx=e.x+dx,ny=e.y+dy;if(!blocked(nx,e.y,r))e.x=nx;if(!blocked(e.x,ny,r))e.y=ny;}
  function update(dt){
    const s=state;if(!s||!s.live)return;const p=s.player;s.elapsed+=dt;s.time=Math.max(0,MATCH_SECONDS-s.elapsed);s.shotCooldown-=dt;
    const shrinkT=clamp((s.elapsed-s.zone.delay)/s.zone.shrink,0,1);s.zone.r=s.zone.startR+(s.zone.endR-s.zone.startR)*shrinkT;
    let dx=(keys.has('right')||[...pointers.values()].includes('right')?1:0)-(keys.has('left')||[...pointers.values()].includes('left')?1:0);
    let dy=(keys.has('down')||[...pointers.values()].includes('down')?1:0)-(keys.has('up')||[...pointers.values()].includes('up')?1:0);
    if(!dx&&!dy&&s.target){dx=s.target.x-p.x;dy=s.target.y-p.y;if(Math.hypot(dx,dy)<18){s.target=null;dx=dy=0;}}
    if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;moveEntity(p,dx*210*dt,dy*210*dt,dt);p.angle=Math.atan2(dy,dx);}
    if(Math.hypot(p.x-s.zone.x,p.y-s.zone.y)>s.zone.r)p.hp=Math.max(0,p.hp-9*dt);
    for(let i=0;i<(s.allies||[]).length;i++){
      const ally=s.allies[i], orbit=s.elapsed*.42+i*2.094, tx=p.x+Math.cos(orbit)*68, ty=p.y+Math.sin(orbit)*58;
      const ax=tx-ally.x, ay=ty-ally.y, ad=Math.hypot(ax,ay);
      if(ad>10){const step=Math.min(ad,125*dt);ally.x+=ax/(ad||1)*step;ally.y+=ay/(ad||1)*step;}
      ally.walk+=dt*5;ally.fire-=dt;
      let target=null, nearest=300; for(const bot of s.bots){const d=dist(ally,bot);if(d<nearest){nearest=d;target=bot;}}
      if(target&&ally.fire<=0){target.hp-=9;ally.fire=1.35;ally.target={x:target.x,y:target.y,until:s.elapsed+.13};if(target.hp<=0){s.bots.splice(s.bots.indexOf(target),1);s.kills++;toast('เพื่อน AI ช่วยทีมจัดการคู่แข่ง');}}
    }
    for(const bot of s.bots){
      bot.fire-=dt;bot.wander-=dt;const d=dist(bot,p);let bx=0,by=0;
      if(d<300){bx=(p.x-bot.x)/(d||1);by=(p.y-bot.y)/(d||1);if(d<150){bx*=-.4;by*=-.4;}}
      else if(bot.wander<=0){bot.turn=Math.random()*Math.PI*2;bot.wander=2.5+Math.random()*4;}
      else{bx=Math.cos(bot.turn)*.38;by=Math.sin(bot.turn)*.38;}
      const sp=d<300?47:23;moveEntity(bot,bx*sp*dt,by*sp*dt,dt,13);bot.walk+=dt*6;
      if(d<165&&s.elapsed>18&&bot.fire<=0){const ang=Math.atan2(p.y-bot.y,p.x-bot.x);s.foeShots.push({x:bot.x,y:bot.y,vx:Math.cos(ang)*340,vy:Math.sin(ang)*340,life:.8});bot.fire=3.8+Math.random()*1.4;}
      if(Math.hypot(bot.x-s.zone.x,bot.y-s.zone.y)>s.zone.r)bot.hp-=dt*7;
    }
    const firing=keys.has('fire')||[...pointers.values()].includes('fire');
    if(firing&&s.shotCooldown<=0&&p.ammo>0&&s.bots.length){let target=null,nearest=550;for(const b of s.bots){const d=dist(b,p);if(d<nearest){nearest=d;target=b;}}
      if(target){p.angle=Math.atan2(target.y-p.y,target.x-p.x);const spread=(Math.random()-.5)*.07;s.bullets.push({x:p.x+Math.cos(p.angle)*18,y:p.y+Math.sin(p.angle)*18,vx:Math.cos(p.angle+spread)*650,vy:Math.sin(p.angle+spread)*650,life:1.1});p.ammo--;s.shotCooldown=.29;}
      else if(p.ammo<=0&&!s.emptyNotified){toast('กระสุนหมด — เดินเข้าใกล้กล่องสีทองเพื่อเก็บกระสุน');s.emptyNotified=true;}
    }
    for(let i=s.bullets.length-1;i>=0;i--){const b=s.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;
      for(let j=s.bots.length-1;j>=0;j--){const bot=s.bots[j];if(Math.hypot(bot.x-b.x,bot.y-b.y)<20){bot.hp-=42;hit=true;if(bot.hp<=0){s.bots.splice(j,1);s.kills++;toast('จัดการคู่แข่ง AI ได้แล้ว');}break;}}
      if(hit||b.life<=0||b.x<0||b.x>W||b.y<0||b.y>H)s.bullets.splice(i,1);
    }
    for(let i=s.foeShots.length-1;i>=0;i--){const b=s.foeShots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(p.x-b.x,p.y-b.y)<19){p.hp=Math.max(0,p.hp-5);s.foeShots.splice(i,1);continue;}if(b.life<=0)s.foeShots.splice(i,1);}
    for(let i=s.loot.length-1;i>=0;i--){const item=s.loot[i];if(Math.hypot(item.x-p.x,item.y-p.y)<34){if(item.type==='med'){if(p.hp>=97){continue;}p.hp=Math.min(100,p.hp+34);toast('เก็บชุดพยาบาล +34 พลังชีวิต');}else{p.ammo+=18;toast('เก็บกระสุน +18');s.emptyNotified=false;}s.loot.splice(i,1);}}
    if(s.time<=0||s.bots.length===0){finish(true);return;}if(p.hp<=0){finish(false);return;}
    if(s.elapsed-s.lastUi>.2){updateHud();s.lastUi=s.elapsed;}
  }
  function updateHud(){if(!state)return;const s=state,p=s.player;document.getElementById('royaleAlive').textContent=String(s.bots.length+1);document.getElementById('royaleAmmo').textContent=String(p.ammo);document.getElementById('royaleHpLabel').textContent=Math.ceil(p.hp)+'%';document.getElementById('royaleHpBar').style.width=clamp(p.hp,0,100)+'%';const secs=Math.ceil(s.time),mm=String(Math.floor(secs/60)).padStart(2,'0'),ss=String(secs%60).padStart(2,'0');document.getElementById('royaleClock').textContent=mm+':'+ss;const hint=document.getElementById('royaleHint');if(s.elapsed<s.zone.delay)hint.innerHTML='<span>วงปลอดภัย</span> จะเริ่มบีบใน '+Math.ceil(s.zone.delay-s.elapsed)+' วิ<br>อยู่ใกล้จุดกลางไว้';else if(Math.hypot(p.x-s.zone.x,p.y-s.zone.y)>s.zone.r)hint.innerHTML='<span style="color:#ff9a7c">ออกนอกวง!</span> กำลังเสียพลังชีวิต<br>รีบกลับเข้าวงสีฟ้า';else hint.innerHTML='<span>ภารกิจ</span> อยู่รอดให้ครบเวลา<br>แตะกล่องสีทองเพื่อเก็บของ';}
  function finish(won){if(!state||!state.live)return;state.live=false;clearInput();document.getElementById('royaleResultIcon').textContent=won?'🏆':'🛡️';document.getElementById('royaleResultTitle').textContent=won?'อยู่รอดสำเร็จ!':'พลังหมด ลองอีกครั้ง';document.getElementById('royaleResultText').textContent=won?`คุณอยู่รอดในสนามครบเวลาและเอาชนะคู่แข่ง AI ได้ ${state.kills} คน • เหลือผู้รอด ${state.bots.length+1} คน • รอบทดลองเล่นคนเดียว`:`คุณกำจัดคู่แข่ง AI ได้ ${state.kills} คนก่อนพลังหมด ลองหลบกระสุนและเก็บชุดพยาบาลระหว่างทาง`;document.getElementById('royaleResult').classList.remove('hidden');}
  function toast(msg){const el=document.getElementById('royaleToast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900);}
  function loop(now){if(!root)return;const dt=last?Math.min((now-last)/1000,.045):.016;last=now;if(state)update(dt);draw(now/1000);raf=requestAnimationFrame(loop);}
  function draw(t){if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,Wp,Hp);const p=state?.player||{x:MAP_CENTER.x,y:MAP_CENTER.y};ctx.save();ctx.translate(Wp/2-p.x*zoom,Hp/2-p.y*zoom);ctx.scale(zoom,zoom);drawMap(ctx,t);if(state){drawZone(ctx,state.zone);drawLoot(ctx,state.loot,t);drawShots(ctx,state);for(const bot of state.bots)drawActor(ctx,bot,false);for(let i=0;i<(state.allies||[]).length;i++)drawAlly(ctx,state.allies[i],i,t);drawActor(ctx,p,true);drawMinimap();}else{drawZone(ctx,{x:MAP_CENTER.x,y:MAP_CENTER.y,r:360});drawMinimapPreview();}ctx.restore();}
  function drawMap(c,t){c.fillStyle='#68975a';c.fillRect(0,0,W,H);for(let y=0;y<H;y+=75)for(let x=0;x<W;x+=88){const v=Math.sin(x*9.3+y*7.1);c.fillStyle=v>.12?'#e8f4cd09':'#183b1d12';c.fillRect(x+((y%7)*3),y,24,3);}
    c.fillStyle='#4b8c87';c.beginPath();c.moveTo(0,1010);c.bezierCurveTo(270,950,340,1070,570,1040);c.bezierCurveTo(800,995,960,1080,1190,1010);c.bezierCurveTo(1330,970,1420,980,1500,950);c.lineTo(1500,1120);c.lineTo(0,1120);c.fill();
    for(const r of roads){c.fillStyle='#bdb894';c.fillRect(r.x-7,r.y-7,r.w+14,r.h+14);c.fillStyle='#666e5d';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle='#ded7a899';c.lineWidth=3;c.setLineDash([22,18]);c.beginPath();if(r.h>r.w){c.moveTo(r.x+r.w/2,r.y);c.lineTo(r.x+r.w/2,r.y+r.h);}else{c.moveTo(r.x,r.y+r.h/2);c.lineTo(r.x+r.w,r.y+r.h/2);}c.stroke();c.setLineDash([]);}
    c.fillStyle='#5d934e';c.beginPath();c.ellipse(415,408,78,40,.25,0,Math.PI*2);c.fill();c.fillStyle='#3c90a0';c.beginPath();c.ellipse(415,408,59,27,.25,0,Math.PI*2);c.fill();c.strokeStyle='#b3e8cf';c.lineWidth=4;c.stroke();
    for(const tr of trees)drawTree(c,tr,t);for(const b of blockers)drawBuilding(c,b);
    c.fillStyle='#c5b983';c.beginPath();c.arc(MAP_CENTER.x,MAP_CENTER.y,43,0,Math.PI*2);c.fill();c.fillStyle='#5c91a1';c.beginPath();c.arc(MAP_CENTER.x,MAP_CENTER.y,26,0,Math.PI*2);c.fill();c.fillStyle='#c9ead4';c.beginPath();c.arc(MAP_CENTER.x,MAP_CENTER.y,5+Math.sin(t*3)*1.5,0,Math.PI*2);c.fill();
  }
  function drawZone(c,z){if(!z)return;c.save();c.beginPath();c.rect(0,0,W,H);c.arc(z.x,z.y,z.r,0,Math.PI*2);c.fillStyle='#cf4b4144';try{c.fill('evenodd')}catch(_){c.fill()}c.beginPath();c.arc(z.x,z.y,z.r,0,Math.PI*2);c.strokeStyle='#9fffe5';c.lineWidth=6;c.shadowColor='#82f7db';c.shadowBlur=22;c.stroke();c.shadowBlur=0;c.strokeStyle='#efffee99';c.lineWidth=2;c.setLineDash([11,10]);c.stroke();c.setLineDash([]);c.restore();}
  function drawTree(c,tr,t){c.fillStyle='#0000002b';c.beginPath();c.ellipse(tr.x+3,tr.y+10,tr.r*1.1,tr.r*.42,0,0,Math.PI*2);c.fill();c.fillStyle='#755137';c.fillRect(tr.x-4,tr.y-4,8,17);c.fillStyle='#305d3b';c.beginPath();c.arc(tr.x,tr.y-7,tr.r,0,Math.PI*2);c.fill();c.fillStyle='#4b7e47';c.beginPath();c.arc(tr.x-5,tr.y-12,tr.r*.69,0,Math.PI*2);c.fill();c.fillStyle='#79a956';c.beginPath();c.arc(tr.x+5,tr.y-15,tr.r*.4+Math.sin(t+tr.x)*.5,0,Math.PI*2);c.fill();}
  function drawBuilding(c,b){c.fillStyle='#00000039';c.beginPath();c.roundRect(b.x+7,b.y+11,b.w,b.h,12);c.fill();c.fillStyle=b.c;c.beginPath();c.roundRect(b.x,b.y+14,b.w,b.h-14,11);c.fill();c.fillStyle=b.roof;c.beginPath();c.roundRect(b.x+7,b.y,b.w-14,b.h-25,10);c.fill();c.fillStyle='#ffffff23';c.fillRect(b.x+17,b.y+8,b.w-34,5);c.fillStyle='#d8e3c5a9';for(let i=0;i<3;i++)c.fillRect(b.x+22+i*(b.w-54)/3,b.y+34,23,20);c.fillStyle='#f7ebc9';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(b.label,b.x+b.w/2,b.y+b.h-6);}
  function drawLoot(c,loot,t){for(const it of loot){const y=it.y+Math.sin(t*3+it.bob)*2;c.fillStyle='#0000003c';c.beginPath();c.ellipse(it.x,y+11,16,6,0,0,Math.PI*2);c.fill();c.fillStyle=it.type==='med'?'#ecdfb4':'#ffd76b';c.beginPath();c.roundRect(it.x-13,y-10,26,20,5);c.fill();c.strokeStyle=it.type==='med'?'#f4fff0':'#fff2ad';c.lineWidth=2;c.stroke();c.fillStyle='#253a27';c.font='bold 12px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(it.type==='med'?'+':'▥',it.x,y);c.textBaseline='alphabetic';c.fillStyle='#fff9cf';c.font='bold 8px system-ui';c.fillText(it.type==='med'?'ยา':'กระสุน',it.x,y-17);}}
  function drawActor(c,a,isPlayer){c.save();c.translate(a.x,a.y);if(isPlayer)c.rotate(a.angle);c.fillStyle='#0000004d';c.beginPath();c.ellipse(0,10,16,8,0,0,Math.PI*2);c.fill();c.fillStyle=isPlayer?'#293b3b':a.color;c.beginPath();c.roundRect(-12,-9,24,23,8);c.fill();c.fillStyle=isPlayer?'#dcb294':'#d8a486';c.beginPath();c.arc(0,-16,10,0,Math.PI*2);c.fill();c.fillStyle=isPlayer?'#242522':'#332622';c.beginPath();c.arc(0,-19,10,Math.PI,Math.PI*2);c.fill();if(isPlayer){c.fillStyle='#dcffe0';c.fillRect(6,-3,20,5);c.fillStyle='#baff69';c.beginPath();c.arc(-9,-8,3,0,Math.PI*2);c.fill();}else{c.fillStyle='#352a25';c.fillRect(10,-3,17,4);c.fillStyle='#fff4c8';c.beginPath();c.arc(-3,-16,1.3,0,Math.PI*2);c.arc(3,-16,1.3,0,Math.PI*2);c.fill();c.restore();c.fillStyle='#351b1d';c.beginPath();c.roundRect(a.x-14,a.y-34,28,4,2);c.fill();c.fillStyle='#fb8171';c.fillRect(a.x-14,a.y-34,28*clamp(a.hp/78,0,1),4);c.fillStyle='#fff4e9';c.font='bold 8px system-ui';c.textAlign='center';c.fillText('AI',a.x,a.y-39);return;}c.restore();c.fillStyle='#efffdc';c.font='bold 10px system-ui';c.textAlign='center';c.fillText('มีนา',a.x,a.y-35);}
  function drawAlly(c,a,index,time){
    c.save();c.translate(a.x,a.y);c.fillStyle='#00000045';c.beginPath();c.ellipse(0,10,16,8,0,0,Math.PI*2);c.fill();c.strokeStyle='#9cffe0';c.lineWidth=2;c.beginPath();c.arc(0,-6,16,0,Math.PI*2);c.stroke();c.fillStyle=a.color;c.beginPath();c.roundRect(-11,-10,22,22,7);c.fill();c.fillStyle='#e1b392';c.beginPath();c.arc(0,-17,9,0,Math.PI*2);c.fill();c.fillStyle='#24352b';c.beginPath();c.arc(0,-20,9,Math.PI,Math.PI*2);c.fill();c.restore();c.fillStyle='#e0fff2';c.font='bold 8px system-ui';c.textAlign='center';c.fillText('AI เพื่อน '+(index+1),a.x,a.y-36);if(a.target&&a.target.until>time){c.strokeStyle='#83f5d1aa';c.lineWidth=3;c.beginPath();c.moveTo(a.x,a.y-7);c.lineTo(a.target.x,a.target.y);c.stroke();}
  }
  function drawShots(c,s){for(const b of s.bullets){c.fillStyle='#fff0a0';c.beginPath();c.arc(b.x,b.y,4,0,Math.PI*2);c.fill();}for(const b of s.foeShots){c.fillStyle='#ff826a';c.beginPath();c.arc(b.x,b.y,4,0,Math.PI*2);c.fill();}}
  function drawMinimap(){if(!mctx||!state)return;const s=state;const mw=mini.width,sc=mw/W;mctx.clearRect(0,0,mw,mw);mctx.fillStyle='#7aa361';mctx.fillRect(0,0,mw,mw);mctx.fillStyle='#536453';for(const r of roads)mctx.fillRect(r.x*sc,r.y*sc,r.w*sc,Math.max(3,r.h*sc));mctx.strokeStyle='#a5ffe4';mctx.lineWidth=2;mctx.beginPath();mctx.arc(s.zone.x*sc,s.zone.y*sc,s.zone.r*sc,0,Math.PI*2);mctx.stroke();for(const b of s.bots){mctx.fillStyle='#ff7768';mctx.beginPath();mctx.arc(b.x*sc,b.y*sc,3,0,Math.PI*2);mctx.fill();}mctx.fillStyle='#fff68f';mctx.beginPath();mctx.arc(s.player.x*sc,s.player.y*sc,4,0,Math.PI*2);mctx.fill();}
  function drawMinimapPreview(){if(!mctx)return;const mw=mini.width,sc=mw/W;mctx.clearRect(0,0,mw,mw);mctx.fillStyle='#7aa361';mctx.fillRect(0,0,mw,mw);mctx.fillStyle='#536453';for(const r of roads)mctx.fillRect(r.x*sc,r.y*sc,r.w*sc,Math.max(3,r.h*sc));mctx.strokeStyle='#a5ffe4';mctx.lineWidth=2;mctx.beginPath();mctx.arc(MAP_CENTER.x*sc,MAP_CENTER.y*sc,360*sc,0,Math.PI*2);mctx.stroke();mctx.fillStyle='#fff68f';mctx.beginPath();mctx.arc(MAP_CENTER.x*sc,MAP_CENTER.y*sc,4,0,Math.PI*2);mctx.fill();}

  if(new URLSearchParams(location.search).get('mode')==='survival'){
    setTimeout(()=>{if(typeof selectZone==='function'){const btn=document.querySelector('.zone[data-zone="battle"]');selectZone('battle',btn);}openRoyale();},80);
  }
  window.openNovaRoyale=openRoyale;
})();
