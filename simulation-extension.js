/* Local-only social, residential and driving simulation for NOVA CITY. */
(() => {
  const WORLD_KEY = 'nova-city-world-simulation-v1';
  const VEHICLES = [
    { id: 'mini', name: 'NOVA MINI', x: 1215, y: 864, shape: 'mini' },
    { id: 'suv', name: 'NOVA ADVENTURE', x: 1320, y: 864, shape: 'suv' },
    { id: 'pickup', name: 'NOVA PICKUP', x: 1425, y: 864, shape: 'pickup' }
  ];
  const COLORS = [
    { name: 'เขียวมิ้นต์', value: '#75d7a4' },
    { name: 'ฟ้า', value: '#59b9d6' },
    { name: 'แดง', value: '#e36c63' },
    { name: 'เหลือง', value: '#f1bd60' },
    { name: 'ม่วง', value: '#a691d8' },
    { name: 'ขาว', value: '#eceee6' }
  ];
  const NEIGHBORS = [
    { id: 'nut', name: 'นัท', gender: 'ผู้ชาย', role: 'เพื่อนบ้าน • ชอบสำรวจ', icon: '🧢', shirt: '#d78362' },
    { id: 'fa', name: 'ฟ้า', gender: 'ผู้หญิง', role: 'เพื่อนบ้าน • ชอบสวน', icon: '🌻', shirt: '#df8196' },
    { id: 'om', name: 'โอม', gender: 'ผู้ชาย', role: 'เพื่อนบ้าน • ชอบรถ', icon: '🧑🏻', shirt: '#8295d5' }
  ];
  let worldSave = {};
  try { worldSave = JSON.parse(localStorage.getItem(WORLD_KEY) || '{}') || {}; } catch (_) { worldSave = {}; }
  let friends = new Set(Array.isArray(worldSave.friends) ? worldSave.friends : []);
  let selectedVehicle = VEHICLES.some(v => v.id === worldSave.selectedVehicle) ? worldSave.selectedVehicle : 'suv';
  let vehicleColors = Object.assign({ mini: COLORS[0].value, suv: worldSave.vehicleColor || COLORS[1].value, pickup: COLORS[3].value }, worldSave.vehicleColors || {});
  let vehiclePositions = Object.assign({}, worldSave.vehiclePositions || {});
  let driving = false, waitingForCar = false;
  function selectedCar() { return VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[1]; }
  function carPosition(car) { return vehiclePositions[car.id] || { x: car.x, y: car.y }; }
  function carColor(car) { return vehicleColors[car.id] || COLORS[0].value; }
  function saveWorld() { try { localStorage.setItem(WORLD_KEY, JSON.stringify({ friends: [...friends], selectedVehicle, vehicleColors, vehicleColor: carColor(selectedCar()), vehiclePositions })); } catch (_) {} }

  // Make the same city feel like a small estate instead of one isolated house.
  if (Array.isArray(cityBuildings) && !cityBuildings.some(b => b.label === 'HOME 02')) {
    cityBuildings.push(
      { x: 1415, y: 920, w: 135, h: 130, label: 'HOME 02', roof: '#8d6650', base: '#d7bd9d' },
      { x: 1110, y: 1100, w: 125, h: 82, label: 'HOME 03', roof: '#6e8b68', base: '#c5d1a7' },
      { x: 1260, y: 1100, w: 125, h: 82, label: 'HOME 04', roof: '#8f8057', base: '#dbd0aa' },
      { x: 1415, y: 1100, w: 135, h: 82, label: 'HOME 05', roof: '#727b9b', base: '#c8d0dc' }
    );
  }

  const originalOpenCity = window.openCityScene;
  const originalInteract = window.interactCity;
  const originalUpdateCity = window.updateCity;
  const originalCityBlocked = window.cityBlocked;
  const originalDrawCity = window.drawCity;
  const originalDrawPlayer = window.drawPlayer;

  window.openCityScene = function () {
    originalOpenCity();
    const actions = document.querySelector('#cityGame .city-action');
    if (!actions || document.getElementById('cityFriends')) return;
    const friendsButton = document.createElement('button');
    friendsButton.type = 'button'; friendsButton.id = 'cityFriends'; friendsButton.className = 'city-extra'; friendsButton.textContent = '👥 เพื่อน NPC';
    friendsButton.addEventListener('click', openNeighborPanel);
    const carButton = document.createElement('button');
    carButton.type = 'button'; carButton.id = 'cityVehicle'; carButton.className = 'city-extra'; carButton.textContent = '🚗 รถ';
    carButton.addEventListener('click', vehicleButtonAction);
    const hint = document.getElementById('cityHint');
    if (hint) { actions.insertBefore(friendsButton, hint); actions.insertBefore(carButton, hint); }
    const interact = document.getElementById('cityInteract');
    if (interact) interact.onclick = () => { clearSimulationPanel(); originalInteract(); };
  };

  function popupPanel(emoji, title, intro, html) {
    const layer = document.getElementById('cityPopupBack'), panel = document.querySelector('#cityGame .city-popup');
    if (!layer || !panel) return;
    cityPopupOpen = true;
    document.getElementById('cityPopEmoji').textContent = emoji;
    document.getElementById('cityPopTitle').textContent = title;
    document.getElementById('cityPopText').textContent = intro;
    let content = document.getElementById('citySimulationPanel');
    if (!content) { content = document.createElement('div'); content.id = 'citySimulationPanel'; panel.insertBefore(content, document.getElementById('cityPopClose')); }
    content.innerHTML = html;
    const close = document.getElementById('cityPopClose'); close.textContent = 'กลับเมือง'; close.onclick = closeCityPopup;
    layer.classList.add('open');
    return content;
  }
  function clearSimulationPanel() {
    const content = document.getElementById('citySimulationPanel'); if (content) content.remove();
    const close = document.getElementById('cityPopClose'); if (close) { close.textContent = 'เดินทางต่อ'; close.onclick = closeCityPopup; }
  }

  function openNeighborPanel() {
    const content = popupPanel('👥', 'เพื่อนบ้าน NPC', 'คนในรายการเป็นตัวละครจำลองในเครื่องนี้เท่านั้น • คำขอและการชวนไม่ส่งถึงผู้เล่นจริง', '<div class="friend-list" id="friendList"></div>');
    if (!content) return;
    renderNeighbors();
  }
  function renderNeighbors() {
    const list = document.getElementById('friendList'); if (!list) return;
    list.innerHTML = NEIGHBORS.map(person => {
      const added = friends.has(person.id);
      return `<div class="friend-item"><div class="friend-avatar">${person.icon}</div><div class="friend-copy"><strong>${person.name} · ${person.gender}</strong><small>${person.role} · NPC</small></div><button type="button" data-neighbor="${person.id}">${added ? 'ชวนเดินเล่น' : 'เพิ่มเพื่อน'}</button></div>`;
    }).join('');
    list.querySelectorAll('button[data-neighbor]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.neighbor, person = NEIGHBORS.find(p => p.id === id); if (!person) return;
      if (!friends.has(id)) { friends.add(id); saveWorld(); renderNeighbors(); cityToast(`เพิ่ม ${person.name} เป็นเพื่อน NPC ในเครื่องแล้ว`); }
      else cityToast(`ส่งคำชวนเดินเล่นให้ ${person.name} (จำลองเฉพาะเครื่องนี้)`);
    }));
  }

  function drawCar(c, x, y, color, dir = 'right', parked = false, shape = 'suv') {
    c.save(); c.translate(x, y);
    const rotation = dir === 'up' ? -Math.PI / 2 : dir === 'down' ? Math.PI / 2 : dir === 'left' ? Math.PI : 0;
    c.rotate(rotation);
    const half = shape === 'pickup' ? 40 : shape === 'mini' ? 30 : 35;
    c.fillStyle = '#00000045'; c.beginPath(); c.ellipse(2, 11, half + 3, 17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#151c1c'; c.beginPath(); c.roundRect(-half - 1, -15, half * 2 + 2, 31, 10); c.fill();
    c.fillStyle = color; c.beginPath(); c.roundRect(-half, -19, half * 2, 31, shape === 'mini' ? 15 : 10); c.fill();
    c.fillStyle = '#1e4248'; c.beginPath(); c.roundRect(shape === 'pickup' ? -13 : -14, -15, shape === 'pickup' ? 27 : 29, 24, 7); c.fill();
    if (shape === 'pickup') { c.fillStyle = '#c9d3bd'; c.beginPath(); c.roundRect(19, -12, 15, 22, 3); c.fill(); }
    c.fillStyle = '#8dd7dc'; c.fillRect(-10, -13, 10, 7); c.fillRect(3, -13, 9, 7);
    c.fillStyle = '#f2f1d8'; c.fillRect(half - 8, -12, 5, 5); c.fillRect(half - 8, 5, 5, 5);
    c.fillStyle = '#242827'; c.fillRect(-22, -21, 10, 4); c.fillRect(13, -21, 10, 4); c.fillRect(-22, 12, 10, 4); c.fillRect(13, 12, 10, 4);
    if (parked) { c.fillStyle = '#f6fff0'; c.font = 'bold 8px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(shape.toUpperCase(), 0, -23); }
    c.restore();
  }
  window.drawCity = function () {
    originalDrawCity();
    if (typeof cityCtx === 'undefined' || !cityCtx) return;
    const c = cityCtx;
    c.save();
    drawSign(c, 1332, 822, 'โรงรถ NOVA');
    drawSign(c, 1332, 896, 'หมู่บ้านจัดสรร');
    drawNpc(c, 1156, 868, '#d78362');
    drawNpc(c, 1492, 868, '#df8196');
    for (const car of VEHICLES) {
      if (driving && car.id === selectedVehicle) continue;
      const pos = carPosition(car); drawCar(c, pos.x, pos.y, carColor(car), 'left', true, car.shape);
    }
    c.restore();
  };
  window.drawPlayer = function (c, p) {
    if (driving && document.getElementById('cityGame')) { const car = selectedCar(); drawCar(c, p.x, p.y, carColor(car), p.dir, false, car.shape); return; }
    const selected = (() => { try { return JSON.parse(localStorage.getItem('nova-city-local-demo-v1') || '{}').selected || 'mina'; } catch (_) { return 'mina'; } })();
    const male = selected === 'ray' || selected === 'kai';
    if (male) {
      const previousName = selected === 'ray' ? 'เรย์' : 'ไค';
      drawAvatar(c, p, previousName, selected === 'ray' ? '#4de5c2' : '#ffbd60', true);
    } else drawAvatar(c, p, 'มีนา', '#b9ff64', false);
  };
  function drawAvatar(c, p, name, color, male) {
    const bob = p.walk ? Math.sin(p.walk) * 2 : 0;
    c.fillStyle = '#00000055'; c.beginPath(); c.ellipse(p.x, p.y + 10, 17, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#25343a'; c.beginPath(); c.roundRect(p.x - 12, p.y - 5 + bob, 10, 17, 4); c.roundRect(p.x + 2, p.y - 5 - bob, 10, 17, 4); c.fill();
    c.fillStyle = color; c.beginPath(); c.roundRect(p.x - 15, p.y - 24 + bob, 30, 24, 9); c.fill();
    c.fillStyle = '#e4b493'; c.beginPath(); c.arc(p.x, p.y - 34 + bob, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = male ? '#302722' : '#362520'; c.beginPath(); c.arc(p.x, p.y - 39 + bob, male ? 12 : 14, Math.PI, Math.PI * 2); c.fill(); if (!male) { c.beginPath(); c.arc(p.x - 12, p.y - 29 + bob, 5, 0, Math.PI * 2); c.arc(p.x + 12, p.y - 29 + bob, 5, 0, Math.PI * 2); c.fill(); }
    if (p.dir === 'down') { c.fillStyle = '#26302b'; c.beginPath(); c.arc(p.x - 4, p.y - 34 + bob, 1.4, 0, Math.PI * 2); c.arc(p.x + 4, p.y - 34 + bob, 1.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#324847'; c.beginPath(); c.roundRect(p.x - 17, p.y - 19 + bob, 5, 15, 3); c.roundRect(p.x + 12, p.y - 19 + bob, 5, 15, 3); c.fill();
    c.fillStyle = '#f4ffe8'; c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(name, p.x, p.y - 50 + bob);
  }

  window.cityBlocked = function (x, y) {
    for (const car of VEHICLES) {
      if (car.id !== selectedVehicle || driving) continue;
      const pos = carPosition(car); if (Math.hypot(x - pos.x, y - pos.y) < 36) return true;
    }
    return originalCityBlocked(x, y);
  };
  window.updateCity = function (dt) {
    originalUpdateCity(driving ? dt * 1.45 : dt);
    if (driving) { vehiclePositions[selectedVehicle] = { x: cityPlayer.x, y: cityPlayer.y }; }
    const pos = carPosition(selectedCar());
    if (waitingForCar && Math.hypot(cityPlayer.x - pos.x, cityPlayer.y - pos.y) < 78) { waitingForCar = false; openGarage(); }
  };

  function vehicleButtonAction() {
    if (driving) { driving = false; cityTarget = null; saveWorld(); document.getElementById('cityVehicle').textContent = '🚗 รถ'; cityToast('ลงจากรถแล้ว — เดินสำรวจต่อได้'); return; }
    const pos = carPosition(selectedCar());
    if (Math.hypot(cityPlayer.x - pos.x, cityPlayer.y - pos.y) < 95) { openGarage(); return; }
    waitingForCar = true; cityTarget = { x: pos.x, y: pos.y }; cityToast('กำลังเดินไปที่รถหน้าหมู่บ้าน');
  }
  function openGarage() {
    const car = selectedCar(), color = carColor(car);
    const models = VEHICLES.map(v => `<button type="button" class="vehicle-model ${v.id === selectedVehicle ? 'active' : ''}" data-model="${v.id}">${v.name}</button>`).join('');
    const swatches = COLORS.map(c => `<button type="button" class="vehicle-swatch ${c.value === color ? 'active' : ''}" style="background:${c.value}" data-color="${c.value}" aria-label="สีรถ ${c.name}" title="${c.name}"></button>`).join('');
    const content = popupPanel('🚗', 'โรงรถทดลอง', 'เลือกรุ่นรถและสีของแต่ละคัน แล้วทดลองขับรอบเมือง • รถทุกคันเป็นของจำลอง ไม่มีการซื้อเงินจริง', `<div class="vehicle-models">${models}</div><div class="vehicle-label">${car.name} · เปลี่ยนสีได้ฟรี</div><div class="vehicle-colors">${swatches}</div><button type="button" class="vehicle-drive" id="driveNow">ขับ ${car.name}</button>`);
    if (!content) return;
    content.querySelectorAll('.vehicle-model').forEach(button => button.addEventListener('click', () => { selectedVehicle = button.dataset.model; saveWorld(); openGarage(); }));
    content.querySelectorAll('.vehicle-swatch').forEach(button => button.addEventListener('click', () => { vehicleColors[selectedVehicle] = button.dataset.color; saveWorld(); openGarage(); }));
    document.getElementById('driveNow').onclick = () => {
      const selected = selectedCar(), pos = carPosition(selected);
      driving = true; cityPlayer.x = pos.x; cityPlayer.y = pos.y; cityPlayer.dir = 'left'; cityTarget = null; closeCityPopup();
      const carButton = document.getElementById('cityVehicle'); if (carButton) carButton.textContent = 'ลงจากรถ';
      cityToast('ขึ้นรถแล้ว — ใช้ปุ่มลูกศรขับได้ กด “ลงจากรถ” เพื่อเดินต่อ');
    };
  }

  // Clear custom content before the original point-of-interest dialog is shown.
  const originalInteractButton = window.interactCity;
  window.interactCity = function () { clearSimulationPanel(); originalInteractButton(); };
  const originalClosePopup = window.closeCityPopup;
  window.closeCityPopup = function () { originalClosePopup(); };
})();
