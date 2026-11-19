/* NOVA CITY prototype add-ons: local character shop + three offline survival stages. */
(() => {
  const SAVE_KEY = 'nova-city-local-demo-v1';
  const HEROES = [
    { id: 'mina', name: 'มีนา', role: 'ผู้หญิง • นักสำรวจเริ่มต้น', price: 0, color: '#b9ff64', icon: '🧭' },
    { id: 'ray', name: 'เรย์', role: 'ผู้ชาย • หน่วยลาดตระเวน', price: 400, color: '#4de5c2', icon: '🛡️' },
    { id: 'kai', name: 'ไค', role: 'ผู้ชาย • ผู้พิทักษ์', price: 800, color: '#ffbd60', icon: '⚡' }
  ];
  const STAGES = [
    { id: 'forest', name: 'ป่าหมอก', icon: '🌲', description: 'ตามหาเส้นทางผ่านป่ารก ระวังศัตรู AI ที่เข้ามาใกล้', bg: '#416d49', floor: '#78a86d', wall: '#476448' },
    { id: 'harbor', name: 'ท่าเรือร้าง', icon: '⚓', description: 'หลบสิ่งกีดขวางในท่าเรือและเอาตัวรอดเป็น 3 ระลอก', bg: '#326d78', floor: '#72a99b', wall: '#956d4d' },
    { id: 'ruins', name: 'เมืองเก่า', icon: '🏚️', description: 'สำรวจซากเมืองและรับมือศัตรูจำลองในด่านสุดท้าย', bg: '#555e60', floor: '#929388', wall: '#596266' }
  ];
  let save = {};
  try { save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (_) { save = {}; }
  let novaCoins = Number.isFinite(Number(save.coins)) ? Number(save.coins) : 600;
  let ownedHeroes = new Set(Array.isArray(save.owned) ? save.owned : ['mina']);
  ownedHeroes.add('mina');
  let selectedHero = HEROES.some(h => h.id === save.selected && ownedHeroes.has(h.id)) ? save.selected : 'mina';

  function storeState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: novaCoins, owned: [...ownedHeroes], selected: selectedHero })); } catch (_) {}
    const balance = document.getElementById('coinBalance');
    if (balance) balance.textContent = novaCoins.toLocaleString('th-TH');
  }
  function rewardCoins(amount) {
    novaCoins += amount;
    storeState();
  }
  storeState();

  // Keep the existing NOVA CITY entry point, but make the survival zone playable.
  window.enterZone = function () {
    if (currentZone === 'battle') { openArenaSelect(); return; }
    if (currentZone === 'social') { openChat(); return; }
    if (currentZone === 'home') { showModal('บ้านและรถ', 'บ้านตัวอย่างอยู่ในเมือง 2D แล้ว ลองเดินไปที่ป้ายบ้านของมีนาเพื่อสำรวจ ส่วนการสร้างบ้านและการเชื่อมต่อออนไลน์ยังไม่ได้พัฒนา', 'เข้าใจแล้ว'); return; }
    openCityScene();
  };
  window.startBattle = function () { openArenaSelect(); };
  if (zoneInfo && zoneInfo.battle) {
    zoneInfo.battle.kicker = 'ผจญภัย • 3 ด่านทดลอง';
    zoneInfo.battle.title = 'เอาชีวิตรอด<br>แล้วไปต่อ';
    zoneInfo.battle.text = 'เลือกด่าน เดินหลบสิ่งกีดขวาง และยิงศัตรู AI เพื่อผ่าน 3 ระลอก รับเหรียญทดลองกลับไปปลดล็อกตัวละคร';
    zoneInfo.battle.button = 'เลือกด่าน';
  }

  const originalOpenCityScene = window.openCityScene;
  window.openCityScene = function () {
    originalOpenCityScene();
    const head = document.querySelector('#cityGame .city-head');
    if (!head || document.getElementById('cityShop')) return;
    const shop = document.createElement('button');
    shop.type = 'button'; shop.id = 'cityShop'; shop.className = 'city-shop'; shop.textContent = 'ตัวละคร';
    shop.addEventListener('click', openCharacterShop);
    const count = document.getElementById('cityCount');
    head.insertBefore(shop, count);
    const back = document.querySelector('#cityGame .city-back');
    if (back) back.textContent = '← กลับ';
  };

  function openCharacterShop() {
    const layer = document.getElementById('cityPopupBack');
    if (!layer) return;
    cityPopupOpen = true;
    document.getElementById('cityPopEmoji').textContent = '🧍';
    document.getElementById('cityPopTitle').textContent = 'ร้านตัวละครทดลอง';
    document.getElementById('cityPopText').textContent = `ใช้เหรียญทดลองจากการผ่านด่านเท่านั้น • มียอด ${novaCoins.toLocaleString('th-TH')} เหรียญ • ไม่มีเงินจริงหรือการจ่ายเงิน`;
    const panel = document.querySelector('#cityGame .city-popup');
    let list = document.getElementById('cityShopList');
    if (!list) {
      list = document.createElement('div'); list.id = 'cityShopList'; list.className = 'shop-list';
      panel.insertBefore(list, document.getElementById('cityPopClose'));
    }
    renderCharacterShop();
    const close = document.getElementById('cityPopClose');
    close.textContent = 'กลับเมือง'; close.onclick = closeCityPopup;
    layer.classList.add('open');
  }
  function renderCharacterShop() {
    const list = document.getElementById('cityShopList');
    if (!list) return;
    list.innerHTML = HEROES.map(hero => {
      const owned = ownedHeroes.has(hero.id), selected = selectedHero === hero.id;
      const label = selected ? 'กำลังใช้' : owned ? 'เลือกใช้' : `แลก ${hero.price} เหรียญ`;
      const disabled = selected || (!owned && novaCoins < hero.price);
      return `<div class="shop-item"><div class="shop-avatar" style="color:${hero.color}">${hero.icon}</div><div class="shop-copy"><strong>${hero.name}${selected ? ' · กำลังใช้' : ''}</strong><small>${hero.role}${owned ? '' : ` · ราคา ${hero.price} เหรียญ`}</small></div><button type="button" data-hero="${hero.id}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
    }).join('');
    list.querySelectorAll('button[data-hero]').forEach(button => button.addEventListener('click', () => chooseShopHero(button.dataset.hero)));
  }
  function chooseShopHero(id) {
    const hero = HEROES.find(h => h.id === id);
    if (!hero) return;
    if (!ownedHeroes.has(id)) {
      if (novaCoins < hero.price) {
        document.getElementById('cityPopText').textContent = `เหรียญยังไม่พอสำหรับ ${hero.name} ต้องการ ${hero.price} เหรียญ • ผ่านด่านผจญภัยเพื่อรับเหรียญเพิ่ม`;
        return;
      }
      novaCoins -= hero.price; ownedHeroes.add(id);
    }
    selectedHero = id; storeState();
    document.getElementById('cityPopText').textContent = `${hero.name} พร้อมออกสำรวจแล้ว • เหรียญทดลอง ${novaCoins.toLocaleString('th-TH')} เหรียญ`;
    renderCharacterShop();
  }

  // Use the selected demo character in both walkable scenes.
  window.drawPlayer = function (c, p) {
    const hero = HEROES.find(h => h.id === selectedHero) || HEROES[0];
    const bob = p.walk ? Math.sin(p.walk) * 2 : 0;
    c.fillStyle = '#00000055'; c.beginPath(); c.ellipse(p.x, p.y + 10, 17, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#25343a'; c.beginPath(); c.roundRect(p.x - 12, p.y - 5 + bob, 10, 17, 4); c.roundRect(p.x + 2, p.y - 5 - bob, 10, 17, 4); c.fill();
    c.fillStyle = hero.color; c.beginPath(); c.roundRect(p.x - 15, p.y - 24 + bob, 30, 24, 9); c.fill();
    c.fillStyle = '#e4b493'; c.beginPath(); c.arc(p.x, p.y - 34 + bob, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#302722'; c.beginPath(); c.arc(p.x, p.y - 39 + bob, 13, Math.PI, Math.PI * 2); c.fill(); c.fillRect(p.x - 13, p.y - 39 + bob, 26, 5);
    if (p.dir === 'down') { c.fillStyle = '#26302b'; c.beginPath(); c.arc(p.x - 4, p.y - 34 + bob, 1.4, 0, Math.PI * 2); c.arc(p.x + 4, p.y - 34 + bob, 1.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#324847'; c.beginPath(); c.roundRect(p.x - 17, p.y - 19 + bob, 5, 15, 3); c.roundRect(p.x + 12, p.y - 19 + bob, 5, 15, 3); c.fill();
    c.fillStyle = '#f4ffe8'; c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(hero.name, p.x, p.y - 50 + bob);
  };

  let arenaCanvas, arenaCtx, arenaFrame, arenaLast = 0, arenaDpr = 1, arenaW = 0, arenaH = 0, arenaWalls = [];
  let arenaState = null, arenaKeys = new Set(), arenaPointers = new Map(), arenaFireKey = false;
  const arenaKeyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

  function openArenaSelect() {
    if (document.getElementById('arenaGame')) { showArenaSelect(); return; }
    const game = document.createElement('section'); game.className = 'arena-game'; game.id = 'arenaGame';
    game.innerHTML = `<canvas id="arenaCanvas" aria-label="ฉากเอาชีวิตรอด 2D"></canvas>
      <div class="arena-select" id="arenaSelect"><div class="arena-select-inner">
        <div class="arena-select-head"><button id="arenaBack">← กลับ</button><div class="city-count" id="arenaBalance">เหรียญ 0</div></div>
        <h1>เลือกด่านผจญภัย</h1><p>เล่นคนเดียวกับศัตรู AI จำลอง เคลื่อนที่ด้วยปุ่มลูกศร กดยิงเพื่อเล็งศัตรูที่อยู่ใกล้ที่สุด ผ่านครบ 3 ระลอกเพื่อรับเหรียญทดลอง • ทุกด่านเล่นฟรี</p>
        <div class="stage-grid">${STAGES.map(stage => `<button class="stage-card" type="button" data-stage="${stage.id}"><span class="stage-art">${stage.icon}</span><strong>${stage.name}</strong><small>${stage.description}</small><span class="stage-go">เริ่มด่าน · เล่นฟรี ↗</span></button>`).join('')}</div>
      </div></div>
      <div class="arena-hud hidden" id="arenaHud"><div class="arena-top"><button id="arenaMenu">← เลือกด่าน</button><div class="arena-stage-name" id="arenaStageName"></div><button id="arenaBalanceTop">🪙 0</button></div><div class="arena-status"><span id="arenaStatus">ระลอก 1/3</span></div></div>
      <div class="arena-controls hidden" id="arenaControls"><div class="arena-pad"><button data-arena-dir="up" aria-label="เดินขึ้น">▲</button><button data-arena-dir="left" aria-label="เดินซ้าย">◀</button><button data-arena-dir="down" aria-label="เดินลง">▼</button><button data-arena-dir="right" aria-label="เดินขวา">▶</button></div><div class="arena-fire-wrap"><button class="arena-fire" id="arenaFire">ยิง</button><span class="arena-fire-hint">เล็งศัตรูใกล้สุด</span></div></div>
      <div class="arena-note" id="arenaNote">ภารกิจ 2D · ศัตรู AI จำลอง · ไม่มีผู้เล่นออนไลน์หรือการซื้อเงินจริง</div>
      <div class="arena-result" id="arenaResult"><div class="arena-result-card"><div class="result-emoji" id="arenaResultIcon">🏆</div><h2 id="arenaResultTitle">ผ่านด่าน</h2><p id="arenaResultText"></p><div class="arena-result-actions"><button class="primary" id="arenaReplay">เล่นด่านอีกครั้ง</button><button id="arenaChoose">เลือกด่านอื่น</button></div></div></div>`;
    document.body.appendChild(game);
    arenaCanvas = document.getElementById('arenaCanvas'); arenaCtx = arenaCanvas.getContext('2d');
    resizeArena(); window.addEventListener('resize', resizeArena); window.addEventListener('keydown', arenaKeyDown); window.addEventListener('keyup', arenaKeyUp); window.addEventListener('blur', clearArenaInputs); window.addEventListener('pointerup', arenaPointerUp); window.addEventListener('pointercancel', arenaPointerUp);
    document.querySelectorAll('.arena-pad button').forEach(button => { button.addEventListener('pointerdown', arenaPointerDown); button.addEventListener('pointerup', arenaPointerUp); button.addEventListener('pointercancel', arenaPointerUp); });
    document.getElementById('arenaFire').addEventListener('pointerdown', arenaPointerDown); document.getElementById('arenaFire').addEventListener('pointerup', arenaPointerUp); document.getElementById('arenaFire').addEventListener('pointercancel', arenaPointerUp);
    document.querySelectorAll('.stage-card').forEach(button => button.addEventListener('click', () => startArenaStage(button.dataset.stage)));
    document.getElementById('arenaBack').onclick = closeArena;
    document.getElementById('arenaMenu').onclick = showArenaSelect;
    document.getElementById('arenaReplay').onclick = () => startArenaStage(arenaState ? arenaState.stage.id : 'forest');
    document.getElementById('arenaChoose').onclick = showArenaSelect;
    updateArenaBalance();
  }
  function updateArenaBalance() {
    const value = novaCoins.toLocaleString('th-TH');
    const one = document.getElementById('arenaBalance'), two = document.getElementById('arenaBalanceTop');
    if (one) one.textContent = `เหรียญ ${value}`;
    if (two) two.textContent = `🪙 ${value}`;
  }
  function closeArena() {
    const game = document.getElementById('arenaGame'); if (!game) return;
    cancelAnimationFrame(arenaFrame); window.removeEventListener('resize', resizeArena); window.removeEventListener('keydown', arenaKeyDown); window.removeEventListener('keyup', arenaKeyUp); window.removeEventListener('blur', clearArenaInputs); window.removeEventListener('pointerup', arenaPointerUp); window.removeEventListener('pointercancel', arenaPointerUp); game.remove(); arenaState = null;
  }
  function showArenaSelect() {
    const select = document.getElementById('arenaSelect'); if (!select) return;
    cancelAnimationFrame(arenaFrame); arenaFrame = null;
    arenaState = null; arenaKeys.clear(); arenaPointers.clear(); arenaFireKey = false;
    document.getElementById('arenaHud').classList.add('hidden'); document.getElementById('arenaControls').classList.add('hidden');
    document.getElementById('arenaResult').classList.remove('open'); select.style.display = 'flex'; updateArenaBalance();
  }
  function startArenaStage(id) {
    const stage = STAGES.find(s => s.id === id) || STAGES[0];
    const select = document.getElementById('arenaSelect'); if (!select) return;
    select.style.display = 'none'; document.getElementById('arenaResult').classList.remove('open');
    document.getElementById('arenaHud').classList.remove('hidden'); document.getElementById('arenaControls').classList.remove('hidden');
    document.getElementById('arenaStageName').textContent = stage.icon + ' ' + stage.name;
    arenaState = { stage, player: { x: arenaW * .5, y: arenaH * .55, dir: 'down', walk: 0, hp: 100 }, enemies: [], bullets: [], wave: 1, toSpawn: 2, spawnTimer: .5, fireTimer: 0, kills: 0, ended: false, lastStatus: 0 };
    arenaLast = 0; clearArenaInputs(); cancelAnimationFrame(arenaFrame); arenaFrame = requestAnimationFrame(arenaLoop);
  }
  function resizeArena() {
    if (!arenaCanvas) return;
    arenaDpr = Math.min(window.devicePixelRatio || 1, 2); arenaW = window.innerWidth; arenaH = window.innerHeight;
    arenaCanvas.width = Math.round(arenaW * arenaDpr); arenaCanvas.height = Math.round(arenaH * arenaDpr);
    arenaWalls = [
      { x: arenaW * .18, y: arenaH * .26, w: arenaW * .17, h: 38 },
      { x: arenaW * .66, y: arenaH * .28, w: arenaW * .18, h: 42 },
      { x: arenaW * .31, y: arenaH * .48, w: arenaW * .15, h: 48 },
      { x: arenaW * .59, y: arenaH * .55, w: arenaW * .16, h: 42 },
      { x: arenaW * .18, y: arenaH * .72, w: arenaW * .19, h: 38 },
      { x: arenaW * .67, y: arenaH * .75, w: arenaW * .16, h: 40 }
    ];
    if (arenaState) { arenaState.player.x = Math.max(35, Math.min(arenaW - 35, arenaState.player.x)); arenaState.player.y = Math.max(90, Math.min(arenaH - 100, arenaState.player.y)); }
  }
  function arenaKeyDown(e) {
    const dir = arenaKeyMap[e.key]; if (dir) { e.preventDefault(); arenaKeys.add(dir); }
    if (e.code === 'Space') { e.preventDefault(); arenaFireKey = true; }
  }
  function arenaKeyUp(e) { const dir = arenaKeyMap[e.key]; if (dir) arenaKeys.delete(dir); if (e.code === 'Space') arenaFireKey = false; }
  function arenaPointerDown(e) {
    e.preventDefault(); const type = e.currentTarget.dataset.arenaDir || 'fire'; arenaPointers.set(e.pointerId, type); e.currentTarget.classList.add('pressed');
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function arenaPointerUp(e) {
    const type = arenaPointers.get(e.pointerId);
    if (type) { arenaPointers.delete(e.pointerId); const pressed = document.querySelector(type === 'fire' ? '#arenaFire' : `.arena-pad button[data-arena-dir="${type}"]`); if (pressed) pressed.classList.remove('pressed'); }
  }
  function clearArenaInputs() { arenaKeys.clear(); arenaPointers.clear(); arenaFireKey = false; document.querySelectorAll('.arena-pad .pressed,.arena-fire.pressed').forEach(e => e.classList.remove('pressed')); }
  function arenaBlocked(x, y, r = 14) {
    if (x < r + 6 || x > arenaW - r - 6 || y < r + 72 || y > arenaH - r - 92) return true;
    return arenaWalls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h);
  }
  function spawnArenaEnemy() {
    if (!arenaState) return;
    const side = Math.floor(Math.random() * 4); let x = 35, y = 100;
    if (side === 0) { x = 30 + Math.random() * (arenaW - 60); y = 90; }
    else if (side === 1) { x = 30 + Math.random() * (arenaW - 60); y = arenaH - 95; }
    else if (side === 2) { x = 30; y = 90 + Math.random() * (arenaH - 190); }
    else { x = arenaW - 30; y = 90 + Math.random() * (arenaH - 190); }
    arenaState.enemies.push({ x, y, hp: 1, attack: Math.random() * .6, wobble: Math.random() * 8, speed: 42 + Math.random() * 18 });
  }
  function arenaLoop(now) {
    if (!document.getElementById('arenaGame')) return;
    const dt = arenaLast ? Math.min((now - arenaLast) / 1000, .05) : .016; arenaLast = now;
    if (arenaState && !arenaState.ended) updateArena(dt, now / 1000);
    drawArena(now / 1000); arenaFrame = requestAnimationFrame(arenaLoop);
  }
  function updateArena(dt, time) {
    const s = arenaState, p = s.player;
    const held = new Set([...arenaKeys, ...arenaPointers.values()].filter(x => x !== 'fire'));
    let dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const nx = p.x + dx * 205 * dt, ny = p.y + dy * 205 * dt;
      if (!arenaBlocked(nx, p.y)) p.x = nx; if (!arenaBlocked(p.x, ny)) p.y = ny;
      p.walk += dt * 12; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    } else p.walk = 0;
    s.fireTimer -= dt;
    const shooting = arenaFireKey || arenaPointers.has([...arenaPointers.keys()].find(key => arenaPointers.get(key) === 'fire'));
    if (shooting && s.fireTimer <= 0 && s.enemies.length) {
      let target = null, nearest = Infinity;
      for (const enemy of s.enemies) { const distance = Math.hypot(enemy.x - p.x, enemy.y - p.y); if (distance < nearest) { nearest = distance; target = enemy; } }
      if (target && nearest < Math.max(arenaW, arenaH) * .72) {
        const dx2 = target.x - p.x, dy2 = target.y - p.y, length = Math.hypot(dx2, dy2) || 1;
        s.bullets.push({ x: p.x, y: p.y - 18, vx: dx2 / length * 390, vy: dy2 / length * 390, life: 1.4 });
        s.fireTimer = .32;
      }
    }
    for (let i = s.bullets.length - 1; i >= 0; i--) {
      const b = s.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; let hit = false;
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const enemy = s.enemies[j];
        if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < 20) { enemy.hp--; hit = true; if (enemy.hp <= 0) { s.enemies.splice(j, 1); s.kills++; } break; }
      }
      if (hit || b.life <= 0 || b.x < 0 || b.y < 0 || b.x > arenaW || b.y > arenaH) s.bullets.splice(i, 1);
    }
    for (const enemy of s.enemies) {
      const ex = p.x - enemy.x, ey = p.y - enemy.y, dist = Math.hypot(ex, ey) || 1;
      if (dist > 25) { const mx = enemy.x + ex / dist * enemy.speed * dt, my = enemy.y + ey / dist * enemy.speed * dt; if (!arenaBlocked(mx, enemy.y, 12)) enemy.x = mx; if (!arenaBlocked(enemy.x, my, 12)) enemy.y = my; }
      else { enemy.attack -= dt; if (enemy.attack <= 0) { p.hp = Math.max(0, p.hp - 7); enemy.attack = 1.05; } }
    }
    s.spawnTimer -= dt;
    if (s.toSpawn > 0 && s.spawnTimer <= 0) { spawnArenaEnemy(); s.toSpawn--; s.spawnTimer = .7; }
    if (s.toSpawn === 0 && s.enemies.length === 0) {
      if (s.wave < 3) { s.wave++; s.toSpawn = s.wave + 1; s.spawnTimer = 1; }
      else { finishArena(true); return; }
    }
    if (p.hp <= 0) { finishArena(false); return; }
    if (time - s.lastStatus > .2) { document.getElementById('arenaStatus').textContent = `พลัง ${Math.ceil(p.hp)}% · ระลอก ${s.wave}/3 · กำจัด ${s.kills}`; s.lastStatus = time; }
  }
  function finishArena(won) {
    if (!arenaState || arenaState.ended) return;
    arenaState.ended = true; clearArenaInputs();
    const result = document.getElementById('arenaResult');
    if (won) {
      const reward = 180 + STAGES.indexOf(arenaState.stage) * 20; rewardCoins(reward); updateArenaBalance();
      document.getElementById('arenaResultIcon').textContent = '🏆';
      document.getElementById('arenaResultTitle').textContent = 'ผ่านด่านแล้ว!';
      document.getElementById('arenaResultText').textContent = `คุณผ่าน ${arenaState.stage.name} ครบ 3 ระลอก ได้รับ ${reward} เหรียญทดลอง • นำเหรียญไปแลกตัวละครได้ในเมือง • บันทึกไว้เฉพาะอุปกรณ์นี้`;
      document.getElementById('arenaReplay').textContent = 'เล่นด่านนี้อีกครั้ง';
    } else {
      document.getElementById('arenaResultIcon').textContent = '🛡️';
      document.getElementById('arenaResultTitle').textContent = 'ลองใหม่ได้';
      document.getElementById('arenaResultText').textContent = `ยังไม่ผ่าน ${arenaState.stage.name} รอบนี้ ลองขยับหลบขณะกดยิง แล้วกลับมาได้โดยไม่เสียเหรียญ`;
      document.getElementById('arenaReplay').textContent = 'ลองด่านอีกครั้ง';
    }
    result.classList.add('open');
  }
  function drawArena(time) {
    if (!arenaCtx) return;
    const c = arenaCtx, s = arenaState, stage = s ? s.stage : STAGES[0];
    c.setTransform(arenaDpr, 0, 0, arenaDpr, 0, 0); c.clearRect(0, 0, arenaW, arenaH);
    c.fillStyle = stage.floor; c.fillRect(0, 0, arenaW, arenaH);
    c.fillStyle = stage.bg; c.globalAlpha = .17;
    for (let y = 20; y < arenaH; y += 58) for (let x = 20; x < arenaW; x += 68) { const v = Math.sin(x * 1.3 + y * 2.7); if (v > .2) c.fillRect(x, y, 22, 4); }
    c.globalAlpha = 1;
    if (stage.id === 'harbor') { c.fillStyle = '#4b9baf'; c.globalAlpha = .38; c.fillRect(0, arenaH * .84, arenaW, arenaH * .16); c.globalAlpha = 1; }
    if (stage.id === 'ruins') { c.strokeStyle = '#ded8c133'; c.lineWidth = 2; for (let x = 20; x < arenaW; x += 48) { c.beginPath(); c.moveTo(x, 80); c.lineTo(x, arenaH - 80); c.stroke(); } }
    for (let i = 0; i < arenaWalls.length; i++) {
      const wall = arenaWalls[i]; c.fillStyle = '#00000035'; c.beginPath(); c.roundRect(wall.x + 4, wall.y + 7, wall.w, wall.h, 9); c.fill();
      c.fillStyle = stage.wall; c.beginPath(); c.roundRect(wall.x, wall.y, wall.w, wall.h, 8); c.fill();
      c.fillStyle = '#ffffff30'; c.fillRect(wall.x + 5, wall.y + 5, wall.w - 10, 4);
      if (stage.id === 'forest') { c.fillStyle = '#78a96a'; c.beginPath(); c.arc(wall.x + wall.w / 2, wall.y + 12, 13, 0, Math.PI * 2); c.fill(); }
      else if (stage.id === 'harbor') { c.strokeStyle = '#e5c294'; c.lineWidth = 3; c.strokeRect(wall.x + 8, wall.y + 9, wall.w - 16, wall.h - 18); }
      else { c.strokeStyle = '#b7c0ba'; c.lineWidth = 2; c.beginPath(); c.moveTo(wall.x + 6, wall.y + wall.h - 6); c.lineTo(wall.x + wall.w - 6, wall.y + 6); c.stroke(); }
    }
    if (!s) return;
    for (const bullet of s.bullets) { c.fillStyle = '#c8ff83'; c.beginPath(); c.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff4ac'; c.beginPath(); c.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2); c.fill(); }
    for (const enemy of s.enemies) {
      c.fillStyle = '#0000004a'; c.beginPath(); c.ellipse(enemy.x, enemy.y + 10, 16, 7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#bb4e48'; c.beginPath(); c.roundRect(enemy.x - 13, enemy.y - 15, 26, 26, 9); c.fill();
      c.fillStyle = '#e9ae91'; c.beginPath(); c.arc(enemy.x, enemy.y - 20, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#402c27'; c.beginPath(); c.arc(enemy.x, enemy.y - 24, 10, Math.PI, Math.PI * 2); c.fill();
      c.fillStyle = '#fff0c5'; c.beginPath(); c.arc(enemy.x - 3, enemy.y - 19, 1.6, 0, Math.PI * 2); c.arc(enemy.x + 3, enemy.y - 19, 1.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#401c1a'; c.beginPath(); c.roundRect(enemy.x - 14, enemy.y - 35, 28, 4, 2); c.fill(); c.fillStyle = '#fa7664'; c.fillRect(enemy.x - 14, enemy.y - 35, 28, 4);
    }
    window.drawPlayer(c, s.player);
    const hp = Math.max(0, s.player.hp); c.setTransform(arenaDpr, 0, 0, arenaDpr, 0, 0);
    c.fillStyle = '#07120edb'; c.beginPath(); c.roundRect(12, arenaH - 94 - (window.innerWidth > 760 ? 0 : 0), 110, 24, 10); c.fill();
    c.fillStyle = '#d9ffe0'; c.font = 'bold 10px system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(`พลังชีวิต ${Math.ceil(hp)}%`, 19, arenaH - 82);
    c.fillStyle = '#25372d'; c.beginPath(); c.roundRect(19, arenaH - 74, 94, 6, 4); c.fill(); c.fillStyle = hp > 40 ? '#83e889' : '#ff9d61'; c.beginPath(); c.roundRect(19, arenaH - 74, 94 * hp / 100, 6, 4); c.fill();
  }

  // Update top-page coin number when the local save is initialized.
  storeState();
})();
