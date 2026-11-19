/* One linked NOVA CITY prototype: local home, chat, driving and level-builder zones. */
(() => {
  const ARENA_KEY = 'nova-city-built-arena-v1';
  const TRACK_KEY = 'nova-city-race-track-v1';
  const HOME_KEY = 'nova-city-home-v1';
  const RACE_W = 900, RACE_H = 700;
  const homeState = read(HOME_KEY, { wall: '#cbb694', roof: '#a95342', props: ['🌳', '🌼'] });
  let buildMode = 'arena', builderCanvas = null, builderCtx = null, builderAnimation = 0;
  let arenaWalls = read(ARENA_KEY, { walls: [] }).walls || [];
  let raceCones = read(TRACK_KEY, { cones: [] }).cones || [];
  let raceLayout = read(TRACK_KEY, { layout: 'oval' }).layout || 'oval';
  let raceCanvas, raceCtx, raceFrame = 0, raceLast = 0, raceDpr = 1, raceScale = 1, raceOx = 0, raceOy = 0;
  let racer = { x: 412, y: 545, angle: 0, speed: 0, lap: 0, prevX: 412, started: false, elapsed: 0, best: 0 };
  const raceHeld = new Set();
  let chatMessages = [
    { icon: '🧢', name: 'นัท · เพื่อนบ้าน NPC', text: 'วันนี้เราไปสำรวจย่านตลาดกันไหม? (ข้อความจำลอง)' },
    { icon: '🌻', name: 'ฟ้า · เพื่อนบ้าน NPC', text: 'ฉันช่วยเป็นเพื่อนร่วมทีม AI ในสนามทดลองได้นะ!' },
    { icon: '🧑🏻', name: 'โอม · เพื่อนบ้าน NPC', text: 'รถสีฟ้าจอดอยู่หน้าโรงรถ ลองขับรอบเมืองดูสิ' }
  ];
  const N = (tag, attrs = {}, html = '') => {
    const node = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'class') node.className = val;
      else if (key === 'style') node.setAttribute('style', val);
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), val);
      else node.setAttribute(key, val);
    }
    node.innerHTML = html;
    return node;
  };
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }

  Object.assign(zoneInfo, {
    city: { kicker: 'เมืองใช้ชีวิต • รุ่น 2D เดิม', title: 'เมืองของเรา<br>เรื่องราวของคุณ', text: 'เดินสำรวจบ้าน ร้านค้า เพื่อนบ้าน NPC และโรงรถในเมืองรุ่นทดลองเดิม', button: 'เข้าเมือง 2D' },
    battle: { kicker: 'NOVA CITY • แบตเทิลรอยัล 3D', title: 'ลงสนาม<br>วงสุดท้าย', text: 'ลงสนาม 3D เก็บอาวุธและเสบียง สู้กับคู่แข่ง AI และกลับเข้าวงปลอดภัยที่ค่อย ๆ หด • เล่นคนเดียวกับบอท', button: 'ลงสนาม 3D' },
    home: { kicker: 'บ้านของฉัน • รุ่น 2D เดิม', title: 'แต่งบ้าน<br>ในโลก NOVA CITY', text: 'ทดลองเลือกสีบ้านและของตกแต่ง แล้วกลับไปเดินดูย่านบ้านในเมืองรุ่นเดิม', button: 'แต่งบ้าน 2D' },
    social: { kicker: 'พบปะ • NPC จำลอง', title: 'คุยกับเพื่อนบ้าน<br>ในห้องทดลอง', text: 'ส่งข้อความตัวอย่างคุยกับ NPC ในเครื่องนี้เท่านั้น ยังไม่เชื่อมผู้เล่นจริง', button: 'เปิดห้องแชตตัวอย่าง' },
    race: { kicker: 'สนามแข่ง • รุ่น 2D เดิม', title: 'ขับรถวนสนาม<br>เก็บรอบให้ครบ', text: 'รุ่นสนามแข่ง 2D เดิม ส่วนสนามขับรถ 3D อยู่ในการ์ดแยก', button: 'ลงสนาม 2D' },
    builder: { kicker: 'สร้างสนาม • รุ่น 2D เดิม', title: 'ออกแบบสนาม<br>ของ NOVA CITY', text: 'เครื่องมือวางผัง 2D เดิม • ใช้เครื่องมือสร้างสนาม 3D แยกเพื่อวางสิ่งของในโลกใหม่', button: 'สร้างสนาม 2D' }
  });
  const battleCard = document.querySelector('.zone[data-zone="battle"]');
  const zoneGrid = document.getElementById('zoneGrid');
  if (battleCard) { battleCard.querySelector('strong').textContent = 'สนามต่อสู้ 3D'; battleCard.querySelector('span').textContent = 'ยิง • มวย • ดาบ • บอท AI'; }
  if (zoneGrid && !zoneGrid.querySelector('[data-zone="race"]')) {
    zoneGrid.insertAdjacentHTML('beforeend', '<button class="zone" data-zone="race" onclick="selectZone(\'race\',this)"><div class="zone-icon">🏁</div><strong>สนามแข่งรถ 2D เดิม</strong><span>เลือกคัน • ขับรุ่นก่อนหน้า</span></button><button class="zone" data-zone="builder" onclick="selectZone(\'builder\',this)"><div class="zone-icon">🧱</div><strong>สร้างสนาม 2D เดิม</strong><span>เครื่องมือวางผังรุ่นก่อนหน้า</span></button>');
  }
  const homeCard = document.querySelector('.zone[data-zone="home"]');
  if (homeCard) { homeCard.querySelector('strong').textContent = 'แต่งบ้าน 2D เดิม'; homeCard.querySelector('span').textContent = 'แต่งบ้าน • กลับไปดูในเมือง'; }
  const socialCard = document.querySelector('.zone[data-zone="social"]');
  if (socialCard) { socialCard.querySelector('strong').textContent = 'คุยกับเพื่อนบ้าน'; socialCard.querySelector('span').textContent = 'แชต NPC • จำลองในเครื่อง'; }
  const survivalIntro = document.querySelector('#royaleLobby .royale-lobby-card > p');
  if (survivalIntro) survivalIntro.textContent = 'โซนต่อสู้ในโลกเดียวกับเมือง NOVA CITY: เดินหาของ เก็บกระสุนและชุดพยาบาล หลบคู่แข่ง AI และวงปลอดภัย พร้อมเพื่อนร่วมทีม AI 3 คนช่วยคุณ';
  const oldMeta = document.querySelector('#royaleLobby .royale-lobby-meta');
  if (oldMeta) oldMeta.innerHTML = '<div class="royale-meta"><strong>4 คน</strong><small>คุณ + เพื่อน AI 3 คน</small></div><div class="royale-meta"><strong>7 คน</strong><small>คู่แข่งเป็น AI</small></div><div class="royale-meta"><strong>ฟรี</strong><small>เล่นคนเดียวบนเครื่องนี้</small></div>';
  const battleHint = document.getElementById('royaleHint');
  if (battleHint) battleHint.innerHTML = '<span>ทีม NOVA</span> คุณ + เพื่อน AI 3 คน<br>คู่แข่ง AI 7 คน · ไม่มีออนไลน์จริง';

  const baseEnter = window.enterZone;
  const baseOpenBattle = window.openNovaRoyale;
  function openNovaBattle() {
    baseOpenBattle();
    const intro = document.querySelector('#royaleLobby .royale-lobby-card > p');
    if (intro) intro.textContent = 'โซนต่อสู้ในโลกเดียวกับเมือง NOVA CITY: เดินหาของ เก็บกระสุนและชุดพยาบาล หลบคู่แข่ง AI และวงปลอดภัย พร้อมเพื่อนร่วมทีม AI 3 คนช่วยคุณ';
    const meta = document.querySelector('#royaleLobby .royale-lobby-meta');
    if (meta) meta.innerHTML = '<div class="royale-meta"><strong>4 คน</strong><small>คุณ + เพื่อน AI 3 คน</small></div><div class="royale-meta"><strong>7 คน</strong><small>คู่แข่งเป็น AI</small></div><div class="royale-meta"><strong>ฟรี</strong><small>เล่นคนเดียวบนเครื่องนี้</small></div>';
    const hint = document.getElementById('royaleHint');
    if (hint) hint.innerHTML = '<span>ทีม NOVA</span> คุณ + เพื่อน AI 3 คน<br>คู่แข่ง AI 7 คน · ไม่มีออนไลน์จริง';
  }
  window.enterZone = function () {
    if (currentZone === 'race') return openNovaRace();
    if (currentZone === 'builder') return openNovaBuilder();
    if (currentZone === 'home') return openNovaHome();
    if (currentZone === 'social') return openNovaChat();
    if (currentZone === 'battle') return openNovaBattle();
    return baseEnter();
  };
  window.openChat = openNovaChat;
  window.openNovaRace = openNovaRace;
  window.openNovaBattle = openNovaBattle;
  window.openNovaBuilder = openNovaBuilder;
  window.openNovaHome = openNovaHome;
  window.openNovaChat = openNovaChat;

  function zoneButtons() {
    return '<div class="nova-chipbar" aria-label="ไปยังโซนในโลกเดียวกัน"><button class="nova-chip" onclick="novaGo(\'city\')">🌆 เมือง</button><button class="nova-chip" onclick="novaGo(\'home\')">🏠 บ้าน</button><button class="nova-chip" onclick="novaGo(\'race\')">🏁 แข่งรถ</button><button class="nova-chip" onclick="novaGo(\'battle\')">🎯 ต่อสู้</button><button class="nova-chip" onclick="novaGo(\'social\')">💬 แชต</button><button class="nova-chip" onclick="novaGo(\'builder\')">🧱 สร้างสนาม</button></div>';
  }
  function mountLayer(id, kicker, title, controls = '') {
    document.querySelectorAll('.nova-layer').forEach(x => x.remove());
    const layer = N('section', { id, class: 'nova-layer' });
    layer.innerHTML = `<div class="nova-shell"><header class="nova-screen-head"><div style="flex:1"><span class="nova-kicker">${kicker}</span><h1>${title}</h1></div>${controls}</header>${zoneButtons()}<div id="${id}Content"></div></div>`;
    document.body.appendChild(layer);
    return layer;
  }
  function leaveLayer() { document.querySelectorAll('.nova-layer').forEach(x => x.remove()); cancelAnimationFrame(raceFrame); cancelAnimationFrame(builderAnimation); raceHeld.clear(); }
  function openDestination(id) {
    leaveLayer();
    const card = document.querySelector(`.zone[data-zone="${id}"]`);
    if (card) selectZone(id, card);
    enterZone();
  }
  window.novaGo = openDestination;

  function openNovaHome() {
    leaveLayer();
    const layer = mountLayer('novaHome', 'NOVA CITY • โซนบ้าน', 'บ้านของฉัน', '<button class="nova-btn" onclick="novaCloseLayer()">← เมนูโลก</button>');
    const content = document.getElementById('novaHomeContent');
    content.innerHTML = `<div class="nova-home-grid"><div class="nova-panel"><h2 class="nova-subtitle">บ้านตัวอย่างของเรา</h2><p class="nova-copy">เลือกสีหลังคา ผนัง และของตกแต่ง แล้วกด “กลับไปดูบ้านในเมือง” เพื่อเดินสำรวจย่านบ้านในโลก NOVA CITY</p><div class="nova-home-art"><div class="nova-home-sun"></div><div class="nova-house" id="houseArt"><div class="nova-roof"></div><div class="nova-window left"></div><div class="nova-window right"></div><div class="nova-door"></div><div class="nova-yard"></div><span class="nova-yard-item one" id="houseProp1"></span><span class="nova-yard-item two" id="houseProp2"></span></div></div><div class="nova-note">บันทึกสีบ้านในเบราว์เซอร์เครื่องนี้เท่านั้น • ไม่มีบัญชีหรือผู้เล่นออนไลน์จริง</div><div class="nova-actions"><button class="nova-btn primary" onclick="novaGo('city')">กลับไปดูบ้านในเมือง</button><button class="nova-btn" onclick="novaGo('race')">ไปโรงรถและสนามแข่ง</button></div></div><aside class="nova-panel"><h2 class="nova-subtitle">ปรับแต่งบ้าน</h2><div class="nova-home-options"><div><div class="nova-small" style="margin:8px 0">สีผนังบ้าน</div><div class="nova-swatches" id="wallSwatches"></div></div><div><div class="nova-small" style="margin:8px 0">สีหลังคา</div><div class="nova-swatches" id="roofSwatches"></div></div><div><div class="nova-small" style="margin:8px 0">ของตกแต่งลานบ้าน</div><div class="nova-props" id="homeProps"></div></div></div><div class="nova-note">นี่เป็นเครื่องมือปรับแต่งตัวอย่าง 2D ที่เชื่อมกับโซนเมือง ยังไม่มีระบบสร้างบ้าน 3D หรือบันทึกบนเซิร์ฟเวอร์</div></aside></div>`;
    const wallColors = ['#cbb694', '#ecd59a', '#b8d6c0', '#b6c8de', '#d8a7a0'];
    const roofColors = ['#a95342', '#577e60', '#486b92', '#6e5b85', '#4c5055'];
    function paintSwatches(id, values, selected, key) {
      const holder = document.getElementById(id);
      holder.innerHTML = values.map(color => `<button class="nova-swatch ${color === selected ? 'selected' : ''}" style="background:${color}" aria-label="เลือกสี" data-color="${color}"></button>`).join('');
      holder.querySelectorAll('.nova-swatch').forEach(button => button.addEventListener('click', () => { homeState[key] = button.dataset.color; save(HOME_KEY, homeState); renderHome(); }));
    }
    function renderHome() {
      document.getElementById('houseArt').style.setProperty('--wall', homeState.wall);
      document.getElementById('houseArt').style.setProperty('--roof', homeState.roof);
      document.getElementById('houseProp1').textContent = homeState.props[0] || '';
      document.getElementById('houseProp2').textContent = homeState.props[1] || '';
      paintSwatches('wallSwatches', wallColors, homeState.wall, 'wall');
      paintSwatches('roofSwatches', roofColors, homeState.roof, 'roof');
      document.getElementById('homeProps').innerHTML = ['🌳','🌼','🪴','🪑','🛝','🛵','🧸','🌴'].map(icon => `<button class="nova-prop ${(homeState.props || []).includes(icon) ? 'selected' : ''}" data-prop="${icon}">${icon} ${icon === '🌳' ? 'ต้นไม้' : icon === '🪑' ? 'ม้านั่ง' : icon === '🛝' ? 'สนามเด็กเล่น' : icon === '🛵' ? 'สกู๊ตเตอร์' : icon === '🧸' ? 'ของเล่น' : icon === '🪴' ? 'กระถาง' : icon === '🌴' ? 'ปาล์ม' : 'ดอกไม้'}</button>`).join('');
      document.querySelectorAll('.nova-prop').forEach(button => button.onclick = () => { const icon = button.dataset.prop; homeState.props ||= []; if (homeState.props.includes(icon)) homeState.props = homeState.props.filter(x => x !== icon); else { if (homeState.props.length >= 2) homeState.props.shift(); homeState.props.push(icon); } save(HOME_KEY, homeState); renderHome(); });
    }
    renderHome();
    return layer;
  }
  window.novaCloseLayer = leaveLayer;

  function openNovaChat() {
    leaveLayer();
    const layer = mountLayer('novaChat', 'NOVA CITY • ห้องพบปะ', 'คุยกับเพื่อนบ้าน', '<button class="nova-btn" onclick="novaCloseLayer()">← เมนูโลก</button>');
    document.getElementById('novaChatContent').innerHTML = `<div class="nova-panel"><h2 class="nova-subtitle">ห้องแชตทดลอง</h2><p class="nova-copy">ข้อความจะอยู่ในหน้านี้ชั่วคราวและไม่ถูกส่งให้คนอื่น • นัท ฟ้า และโอมเป็น NPC จำลอง</p><div class="nova-chat-list" id="novaChatList"></div><form class="nova-chat-form" id="novaChatForm"><input id="novaChatInput" maxlength="120" placeholder="พิมพ์ข้อความทดลอง..." autocomplete="off"><button class="nova-btn primary" type="submit">ส่งในเดโม</button></form><div class="nova-note">แชตออนไลน์ บัญชีจริง และการเชื่อมผู้เล่นยังไม่เปิดใช้</div><div class="nova-actions"><button class="nova-btn" onclick="novaGo('city')">ไปพบ NPC ในเมือง</button><button class="nova-btn" onclick="novaGo('battle')">ไปสนามต่อสู้</button></div></div>`;
    const list = document.getElementById('novaChatList');
    function render() { list.innerHTML = chatMessages.map(message => `<div class="nova-chat-message"><span class="avatar">${message.icon}</span><div><strong>${message.name}</strong><p>${escapeText(message.text)}</p></div></div>`).join(''); list.scrollTop = list.scrollHeight; }
    document.getElementById('novaChatForm').addEventListener('submit', e => { e.preventDefault(); const input = document.getElementById('novaChatInput'); const text = input.value.trim(); if (!text) return; chatMessages.push({ icon: '🙂', name: 'คุณ · ผู้เล่นทดลอง', text }); input.value = ''; render(); setTimeout(() => { chatMessages.push({ icon: '🌻', name: 'ฟ้า · NPC', text: 'รับทราบนะ! ข้อความนี้เป็นการตอบกลับจำลองในเครื่อง 🙂' }); render(); }, 450); });
    render();
  }
  function escapeText(text) { const el = document.createElement('span'); el.textContent = text; return el.innerHTML; }

  function openNovaBuilder() {
    leaveLayer();
    const layer = mountLayer('novaBuilder', 'NOVA CITY • ห้องออกแบบ', 'สร้างสนามของเรา', '<button class="nova-btn" onclick="novaCloseLayer()">← เมนูโลก</button>');
    document.getElementById('novaBuilderContent').innerHTML = `<div class="nova-builder-layout"><div class="nova-panel"><div class="nova-action-row"><button class="nova-chip active" id="modeArena">🎯 สนามต่อสู้</button><button class="nova-chip" id="modeRace">🏁 สนามแข่ง</button></div><div class="nova-action-row" id="trackOptions" style="display:none;margin:9px 0"><span class="nova-small">แบบสนามแข่ง:</span><button class="nova-chip" data-layout="oval">วงรี</button><button class="nova-chip" data-layout="street">ถนนเมือง</button></div><div class="nova-builder-caption"><span id="builderModeLabel">แตะช่องเพื่อวาง/เอาสิ่งกีดขวางออก</span><span id="builderCount">0 ชิ้น</span></div><canvas id="builderCanvas" class="nova-builder-canvas" width="900" height="660" aria-label="ผังสนามที่แตะเพื่อแก้ไข"></canvas><div class="nova-actions"><button class="nova-btn primary" id="saveBuilder">บันทึกผังสนาม</button><button class="nova-btn" id="clearBuilder">ล้างผัง</button><button class="nova-btn" id="testBuilder">ลองสนาม</button></div><div class="nova-note" id="builderNote">ผังสนามต่อสู้ที่บันทึกจะถูกใช้ในโหมดเอาตัวรอดบนเครื่องนี้เท่านั้น</div></div><aside class="nova-panel"><h2 class="nova-subtitle">เครื่องมือสร้าง</h2><p class="nova-copy">เลือกโหมดแล้วแตะพื้นที่บนผังเพื่อวางสิ่งกีดขวางหรือกรวยสนาม</p><div class="nova-builder-tools"><button class="nova-tool active" data-tool="wall">🧱 กำแพง / สิ่งกีดขวาง</button><button class="nova-tool" data-tool="crate">📦 กล่องกำบัง</button><button class="nova-tool" data-tool="bush">🌿 พุ่มไม้</button><button class="nova-tool" data-tool="cone">🚧 กรวยสนามแข่ง</button></div><div class="nova-note">ผัง Free-Fire style เป็นเพียงสนามต่อสู้ต้นแบบ 2D: ไม่ได้คัดลอกเกมหรือทรัพย์สินของเกมอื่น</div><div class="nova-actions"><button class="nova-btn" onclick="novaGo('race')">ทดลองขับสนาม</button><button class="nova-btn" onclick="novaGo('battle')">กลับไปสนามต่อสู้</button></div></aside></div>`;
    builderCanvas = document.getElementById('builderCanvas'); builderCtx = builderCanvas.getContext('2d');
    const modeArenaButton = document.getElementById('modeArena'), modeRaceButton = document.getElementById('modeRace');
    modeArenaButton.onclick = () => setBuilderMode('arena'); modeRaceButton.onclick = () => setBuilderMode('race');
    document.querySelectorAll('[data-layout]').forEach(button => button.onclick = () => { raceLayout = button.dataset.layout; document.querySelectorAll('[data-layout]').forEach(x => x.classList.toggle('active', x === button)); drawBuilder(); });
    document.querySelectorAll('.nova-tool').forEach(button => button.onclick = () => { document.querySelectorAll('.nova-tool').forEach(x => x.classList.toggle('active', x === button)); drawBuilder(); });
    builderCanvas.addEventListener('pointerdown', builderTap);
    document.getElementById('saveBuilder').onclick = () => { if (buildMode === 'arena') { save(ARENA_KEY, { custom: true, walls: arenaWalls }); setBuilderNote(`บันทึกสนามต่อสู้ ${arenaWalls.length} จุดแล้ว — จะโหลดเป็นฉากในโหมดเอาตัวรอด`); } else { save(TRACK_KEY, { layout: raceLayout, cones: raceCones }); setBuilderNote(`บันทึกสนามแข่ง ${raceCones.length} กรวยแล้ว — กรวยจะแสดงในโหมดขับรถ`); } };
    document.getElementById('clearBuilder').onclick = () => { if (buildMode === 'arena') arenaWalls = []; else raceCones = []; drawBuilder(); };
    document.getElementById('testBuilder').onclick = () => { if (buildMode === 'arena') { save(ARENA_KEY, { custom: true, walls: arenaWalls }); openDestination('battle'); } else { save(TRACK_KEY, { layout: raceLayout, cones: raceCones }); openDestination('race'); } };
    setBuilderMode('arena');
  }
  function setBuilderNote(text) { const note = document.getElementById('builderNote'); if (note) note.textContent = text; }
  function setBuilderMode(mode) {
    buildMode = mode;
    document.getElementById('modeArena')?.classList.toggle('active', mode === 'arena');
    document.getElementById('modeRace')?.classList.toggle('active', mode === 'race');
    document.getElementById('builderModeLabel').textContent = mode === 'arena' ? 'แตะช่องเพื่อวาง/เอาสิ่งกีดขวางออก' : 'แตะพื้นที่ริมทางเพื่อวาง/เอากรวยออก';
    document.getElementById('trackOptions').style.display = mode === 'race' ? 'flex' : 'none';
    document.querySelectorAll('[data-layout]').forEach(button => button.classList.toggle('active', button.dataset.layout === raceLayout));
    document.getElementById('builderNote').textContent = mode === 'arena' ? 'ผังสนามต่อสู้ที่บันทึกจะถูกใช้ในโหมดเอาตัวรอดบนเครื่องนี้เท่านั้น' : 'กรวยที่วางจะถูกบันทึกและแสดงในสนามแข่งที่ขับได้';
    drawBuilder();
  }
  function drawBuilder() {
    if (!builderCtx || !document.getElementById('novaBuilder')) return;
    cancelAnimationFrame(builderAnimation);
    const c = builderCtx, w = builderCanvas.width, h = builderCanvas.height, t = performance.now() / 1000;
    c.clearRect(0, 0, w, h);
    if (buildMode === 'arena') {
      c.fillStyle = '#71985d'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 50) for (let x = 0; x < w; x += 58) { c.fillStyle = Math.sin(x * 5 + y * 3) > 0 ? '#ffffff08' : '#1737190b'; c.fillRect(x + 7, y + 10, 24, 3); }
      c.fillStyle = '#56635e'; c.fillRect(0, 275, w, 90); c.fillRect(404, 0, 92, h); c.fillStyle = '#d8d0a88a'; c.setLineDash([18, 17]); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 320); c.lineTo(w, 320); c.moveTo(450, 0); c.lineTo(450, h); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#e5f2d04a'; c.lineWidth = 1; for (let col = 0; col <= 15; col++) { c.beginPath(); c.moveTo(col * 60, 0); c.lineTo(col * 60, h); c.stroke(); } for (let row = 0; row <= 11; row++) { c.beginPath(); c.moveTo(0, row * 60); c.lineTo(w, row * 60); c.stroke(); }
      arenaWalls.forEach((cell, index) => drawBlock(c, cell.x * 60 + 6, cell.y * 60 + 6, cell.tool, index));
      document.getElementById('builderCount').textContent = `${arenaWalls.length} จุด`;
    } else {
      c.fillStyle = '#649557'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 45; i++) { c.fillStyle = i % 2 ? '#d1f0a009' : '#1737190b'; c.fillRect((i * 181) % w, (i * 97) % h, 26, 4); }
      drawTrackGeometry(c); raceCones.forEach(cone => drawCone(c, cone.x, cone.y, t)); document.getElementById('builderCount').textContent = `${raceCones.length} กรวย`;
      document.getElementById('builderModeLabel').textContent = raceLayout === 'oval' ? 'วงรี: แตะทางวิ่งเพื่อวาง/เอากรวยออก' : 'ถนนเมือง: แตะทางวิ่งเพื่อวาง/เอากรวยออก';
    }
    document.getElementById('builderCount').dataset.mode = buildMode;
    function drawBlock(ctx, x, y, type, i) { const colors = { wall: '#674e3d', crate: '#c29b4e', bush: '#315b3a' }; ctx.fillStyle = '#00000045'; ctx.fillRect(x + 3, y + 5, 48, 42); ctx.fillStyle = colors[type] || colors.wall; ctx.beginPath(); ctx.roundRect(x, y, 48, 42, 6); ctx.fill(); ctx.strokeStyle = '#fff4d569'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff4d9'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(type === 'crate' ? '▦' : type === 'bush' ? '✿' : '▰', x + 24, y + 25); }
    function drawCone(ctx, x, y, time) { const bounce = Math.sin(time * 3 + x) * 1.5; ctx.fillStyle = '#ffbd64'; ctx.beginPath(); ctx.moveTo(x, y - 13 + bounce); ctx.lineTo(x + 10, y + 10 + bounce); ctx.lineTo(x - 10, y + 10 + bounce); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff4d9'; ctx.fillRect(x - 6, y + 1 + bounce, 12, 3); }
  }
  function builderTap(e) {
    if (e.target !== builderCanvas) return;
    const r = builderCanvas.getBoundingClientRect(), x = (e.clientX - r.left) * builderCanvas.width / r.width, y = (e.clientY - r.top) * builderCanvas.height / r.height;
    if (buildMode === 'arena') {
      const cell = { x: Math.max(0, Math.min(14, Math.floor(x / 60))), y: Math.max(0, Math.min(10, Math.floor(y / 60))) };
      const index = arenaWalls.findIndex(w => w.x === cell.x && w.y === cell.y);
      if (index >= 0) arenaWalls.splice(index, 1); else { const tool = document.querySelector('.nova-tool.active')?.dataset.tool || 'wall'; arenaWalls.push({ ...cell, tool }); }
    } else {
      if (!isRaceRoad(x, y)) { setBuilderNote('วางกรวยบนทางวิ่งสีเทา ไม่ใช่บนสนามหญ้าด้านใน'); return; }
      const index = raceCones.findIndex(c => Math.hypot(c.x - x, c.y - y) < 28);
      if (index >= 0) raceCones.splice(index, 1); else if (raceCones.length < 28) raceCones.push({ x: Math.round(x), y: Math.round(y) });
    }
    drawBuilder();
  }

  function openNovaRace() {
    leaveLayer();
    const layer = mountLayer('novaRace', 'NOVA CITY • สนามแข่ง', 'ทดลองขับในโลกเดียวกัน', '<button class="nova-btn" onclick="novaCloseLayer()">← เมนูโลก</button>');
    document.getElementById('novaRaceContent').innerHTML = `<div class="nova-panel"><p class="nova-copy">กดคันเร่งค้างเพื่อวิ่ง เลี้ยวซ้าย/ขวา และกดเบรกเพื่อลดความเร็ว • คีย์บอร์ดใช้ลูกศรหรือ WASD</p><div class="nova-race-card"><canvas class="nova-race-canvas" id="novaRaceCanvas" aria-label="สนามแข่งรถ 2D"></canvas><div class="nova-race-hud"><div class="nova-race-stat">🏁 รอบ <span id="raceLap">0</span>/3</div><div class="nova-race-stat">⚡ <span id="raceSpeed">0</span> km/h</div><div class="nova-race-stat">⏱ <span id="raceClock">00:00</span></div></div><div class="nova-race-controls"><div class="nova-steer"><button data-race="left" aria-label="เลี้ยวซ้าย">◀</button><button data-race="right" aria-label="เลี้ยวขวา">▶</button></div><div class="nova-pedals"><button class="nova-pedal" data-race="brake">เบรก</button><button class="nova-pedal gas" data-race="gas">เร่ง</button></div></div></div><div class="nova-actions"><button class="nova-btn primary" id="raceReset">เริ่มรอบใหม่</button><button class="nova-btn" onclick="novaGo('builder')">ออกแบบสนาม / วางกรวย</button><button class="nova-btn" onclick="novaGo('city')">กลับไปโรงรถในเมือง</button></div><div class="nova-note">เกมขับรถ 2D ทดลองบนอุปกรณ์นี้ • ไม่ได้เชื่อมผู้เล่นอื่นหรือระบบซื้อรถ</div></div>`;
    raceCanvas = document.getElementById('novaRaceCanvas'); raceCtx = raceCanvas.getContext('2d');
    raceLayout = read(TRACK_KEY, { layout: 'oval' }).layout || 'oval';
    raceCones = read(TRACK_KEY, { cones: [] }).cones || [];
    racer = { x: 412, y: 545, angle: 0, speed: 0, lap: 0, prevX: 412, started: false, elapsed: 0, best: read('nova-city-race-best-v1', 0) };
    resizeRace(); window.addEventListener('resize', resizeRace); window.addEventListener('keydown', raceKeyDown); window.addEventListener('keyup', raceKeyUp); window.addEventListener('blur', clearRace);
    document.querySelectorAll('[data-race]').forEach(button => { button.addEventListener('pointerdown', racePointerDown); button.addEventListener('pointerup', racePointerUp); button.addEventListener('pointercancel', racePointerUp); button.addEventListener('pointerleave', racePointerUp); });
    document.getElementById('raceReset').onclick = () => { racer = { x: 412, y: 545, angle: 0, speed: 0, lap: 0, prevX: 412, started: false, elapsed: 0, best: read('nova-city-race-best-v1', 0) }; };
    raceLast = 0; raceFrame = requestAnimationFrame(raceLoop);
  }
  function resizeRace() { if (!raceCanvas) return; raceDpr = Math.min(devicePixelRatio || 1, 2); raceCanvas.width = Math.round(raceCanvas.clientWidth * raceDpr); raceCanvas.height = Math.round(raceCanvas.clientHeight * raceDpr); raceScale = Math.min(raceCanvas.width / RACE_W, raceCanvas.height / RACE_H); raceOx = (raceCanvas.width - RACE_W * raceScale) / 2; raceOy = (raceCanvas.height - RACE_H * raceScale) / 2; }
  function raceKeyDown(e) { const map = { ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }; if (map[e.key]) { e.preventDefault(); raceHeld.add(map[e.key]); } }
  function raceKeyUp(e) { const map = { ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }; if (map[e.key]) raceHeld.delete(map[e.key]); }
  function racePointerDown(e) { e.preventDefault(); raceHeld.add(e.currentTarget.dataset.race); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} }
  function racePointerUp(e) { raceHeld.delete(e.currentTarget.dataset.race); }
  function clearRace() { raceHeld.clear(); }
  function insideRoundRect(x,y,rx,ry,rw,rh,rad){const qx=Math.abs(x-(rx+rw/2))-(rw/2-rad),qy=Math.abs(y-(ry+rh/2))-(rh/2-rad);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-rad<=0;}
  function isRaceRoad(x,y){if(raceLayout==='street')return insideRoundRect(x,y,75,90,750,520,150)&&!insideRoundRect(x,y,190,215,520,270,100);const r=Math.sqrt(((x-450)/305)**2+((y-350)/193)**2);return r>.76&&r<1.25;}
  function drawTrackGeometry(c){c.fillStyle='#434c49';if(raceLayout==='street'){c.beginPath();c.roundRect(75,90,750,520,150);c.fill();c.strokeStyle='#d8c89a';c.lineWidth=5;c.stroke();c.fillStyle='#649557';c.beginPath();c.roundRect(190,215,520,270,100);c.fill();c.strokeStyle='#d8c89a';c.lineWidth=5;c.stroke();c.beginPath();c.roundRect(132,147,636,406,126);c.strokeStyle='#f0e6af';c.lineWidth=3;c.setLineDash([18,15]);c.stroke();c.setLineDash([]);}else{c.beginPath();c.ellipse(450,350,360,245,0,0,Math.PI*2);c.fill();c.strokeStyle='#d8c89a';c.lineWidth=5;c.stroke();c.beginPath();c.ellipse(450,350,250,140,0,0,Math.PI*2);c.fillStyle='#649557';c.fill();c.strokeStyle='#d8c89a';c.lineWidth=5;c.stroke();c.beginPath();c.ellipse(450,350,305,193,0,0,Math.PI*2);c.strokeStyle='#f0e6af';c.lineWidth=3;c.setLineDash([18,15]);c.stroke();c.setLineDash([]);}c.fillStyle='#f5efcf';for(let i=0;i<12;i++)c.fillRect(430+(i%2)*18,532+Math.floor(i/2)*4,10,3);}
  function onRaceRoad(x,y){return isRaceRoad(x,y);}
  function raceLoop(now) {
    if (!document.getElementById('novaRace')) return;
    const dt = raceLast ? Math.min((now - raceLast) / 1000, .05) : .016; raceLast = now; racer.elapsed += dt;
    if (raceHeld.has('gas')) racer.speed = Math.min(285, racer.speed + 190 * dt); else racer.speed = Math.max(0, racer.speed - 32 * dt);
    if (raceHeld.has('brake')) racer.speed = Math.max(0, racer.speed - 260 * dt);
    const steer = (raceHeld.has('right') ? 1 : 0) - (raceHeld.has('left') ? 1 : 0);
    if (Math.abs(racer.speed) > 12) racer.angle += steer * 2.0 * dt * Math.min(1, racer.speed / 75);
    const nx = racer.x + Math.cos(racer.angle) * racer.speed * dt, ny = racer.y + Math.sin(racer.angle) * racer.speed * dt;
    if (onRaceRoad(nx, ny)) { racer.prevX = racer.x; racer.x = nx; racer.y = ny; }
    else if (racer.speed > 5) racer.speed *= -.28;
    if (racer.prevX < 450 && racer.x >= 450 && racer.y > 500 && racer.y < 594 && racer.elapsed > 1) { if (!racer.started) racer.started = true; else racer.lap++; racer.prevX = racer.x; if (racer.lap >= 3) { racer.lap = 3; const seconds = Math.floor(racer.elapsed); if (!racer.best || seconds < racer.best) { racer.best = seconds; save('nova-city-race-best-v1', seconds); } racer.speed = 0; document.getElementById('raceReset').textContent = 'จบแล้ว · เริ่มใหม่'; } }
    drawRace(now / 1000); document.getElementById('raceLap').textContent = racer.lap; document.getElementById('raceSpeed').textContent = Math.round(Math.max(0, racer.speed) * .58); const sec = Math.floor(racer.elapsed); document.getElementById('raceClock').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); raceFrame = requestAnimationFrame(raceLoop);
  }
  function drawRace(time) {
    if (!raceCtx) return; const c = raceCtx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, raceCanvas.width, raceCanvas.height); c.setTransform(raceScale, 0, 0, raceScale, raceOx, raceOy); c.fillStyle = '#6c985c'; c.fillRect(0, 0, RACE_W, RACE_H);
    for (let i = 0; i < 95; i++) { c.fillStyle = i % 2 ? '#ecf3c90a' : '#193d1b10'; c.fillRect((i * 173) % RACE_W, (i * 127) % RACE_H, 30, 4); }
    drawTrackGeometry(c);
    c.fillStyle = '#133223'; c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.fillText('NOVA CITY GRAND LOOP', 450, 350); c.font = 'bold 10px system-ui'; c.fillStyle = '#e7f5d2'; c.fillText('สนามแข่งทดลอง · ขับวนตามเข็มนาฬิกา', 450, 369);
    raceCones.forEach(cone => drawRaceCone(c, cone.x, cone.y)); drawRaceCone(c, 450, 516); drawRaceCone(c, 450, 590);
    c.save(); c.translate(racer.x, racer.y); c.rotate(racer.angle); c.fillStyle = '#00000055'; c.beginPath(); c.ellipse(1, 8, 25, 14, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f3d57c'; c.beginPath(); c.roundRect(-22, -12, 44, 24, 8); c.fill(); c.fillStyle = '#234a51'; c.beginPath(); c.roundRect(-6, -9, 16, 18, 5); c.fill(); c.fillStyle = '#f5fff0'; c.fillRect(15, -8, 5, 5); c.fillRect(15, 4, 5, 5); c.fillStyle = '#222'; c.fillRect(-15, -15, 10, 4); c.fillRect(6, -15, 10, 4); c.fillRect(-15, 11, 10, 4); c.fillRect(6, 11, 10, 4); c.restore();
  }
  function drawRaceCone(c, x, y) { c.fillStyle = '#ffad59'; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 9, y + 9); c.lineTo(x - 9, y + 9); c.closePath(); c.fill(); c.fillStyle = '#fff2d8'; c.fillRect(x - 5, y + 1, 10, 3); }
})();

import('./nova-3d-bridge.js').catch(() => {});
