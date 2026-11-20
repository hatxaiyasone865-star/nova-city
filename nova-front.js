(() => {
  const front = document.getElementById('novaFront');
  if (!front) return;
  const views = { home: document.getElementById('frontHome'), lobby: document.getElementById('frontLobby') };
  const modes = {
    survival: { name: 'เอาตัวรอด • SOLO', map: 'NOVA SHORE', sub: 'เขตชายฝั่ง • พื้นที่เอาตัวรอด', mission: 'survival', zone: 'battle' },
    loot: { name: 'ล่าเสบียง • SOLO', map: 'NOVA SHORE', sub: 'เขตคลังสินค้า • ภารกิจเก็บเสบียง', mission: 'loot', zone: 'battle' },
    world3d: { name: 'สำรวจ NOVA • FREE ROAM', map: 'NOVA CITY', sub: 'โลก 3D • สำรวจได้อย่างอิสระ', zone: 'world3d' }
  };
  const characters = [
    ['player','ผู้เล่น'],['ray','เรย์'],['kai','ไค'],['ton','ต้น'],['beam','บีม'],
    ['mina','มีนา'],['fah','ฟ้า'],['dao','ดาว'],['mai','ไหม'],['nim','นิ่ม']
  ];
  let selectedMode = 'survival';
  let selectedCharacter = 'player';

  try { selectedCharacter = localStorage.getItem('novaCharacterId') || 'player'; } catch (_) {}
  function changeView(name) {
    for (const [key, node] of Object.entries(views)) node.hidden = key !== name;
    document.body.classList.toggle('nova-front-open', true);
    front.scrollTop = 0;
  }
  function chooseMode(mode) {
    if (!modes[mode]) return;
    selectedMode = mode;
    front.querySelectorAll('.front-mode').forEach(button => {
      const selected = button.dataset.frontMode === mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      const label = button.querySelector('i');
      if (label) label.textContent = selected ? 'เลือกแล้ว' : 'เลือก';
    });
    const info = modes[mode];
    document.getElementById('lobbyModeName').textContent = info.name;
    document.getElementById('lobbyMapTitle').textContent = info.map;
    document.getElementById('lobbyMapSub').textContent = info.sub;
  }
  function chooseCharacter(id, name) {
    selectedCharacter = id;
    try { localStorage.setItem('novaCharacterId', id); } catch (_) {}
    window.nova3DWorld?.setCharacter?.(id);
    document.getElementById('lobbyCharacterName').textContent = name.toUpperCase();
    document.getElementById('lobbyAvatarInitial').textContent = name === 'ผู้เล่น' ? 'N' : name.slice(0,1);
    front.querySelectorAll('.lobby-char').forEach(button => button.classList.toggle('selected', button.dataset.characterId === id));
  }
  const charList = document.getElementById('lobbyCharList');
  charList.innerHTML = characters.map(([id,name]) => `<button type="button" class="lobby-char" data-character-id="${id}" aria-label="เลือกตัวละคร ${name}">${name}</button>`).join('');
  charList.querySelectorAll('.lobby-char').forEach(button => button.addEventListener('click', () => chooseCharacter(button.dataset.characterId, characters.find(item => item[0] === button.dataset.characterId)[1])));
  document.getElementById('frontChooseMode').addEventListener('click', () => { changeView('lobby'); chooseMode(selectedMode); chooseCharacter(selectedCharacter, characters.find(item => item[0] === selectedCharacter)?.[1] || 'ผู้เล่น'); });
  document.getElementById('frontBack').addEventListener('click', () => changeView('home'));
  front.querySelectorAll('.front-mode').forEach(button => button.addEventListener('click', () => chooseMode(button.dataset.frontMode)));
  document.getElementById('frontLegacy').addEventListener('click', () => { front.hidden = true; document.body.classList.remove('nova-front-open'); });
  async function deploy() {
    const info = modes[selectedMode];
    const button = document.getElementById('frontDeploy');
    button.disabled = true;
    button.querySelector('span').textContent = 'กำลังเตรียมสนาม…';
    try {
      // Import the existing bridge lazily so the new lobby is also safe to use on a cold page load.
      await import('./nova-3d-bridge.js');
      currentZone = info.zone;
      if (info.mission) localStorage.setItem('novaLobbyMission', info.mission);
      else localStorage.removeItem('novaLobbyMission');
      front.hidden = true;
      document.body.classList.remove('nova-front-open');
      await window.enterZone();
    } catch (error) {
      front.hidden = false;
      changeView('home');
      const toast = document.getElementById('toast');
      if (toast) { toast.textContent = 'โหลดโลก 3D ไม่สำเร็จ • กรุณาลองใหม่ด้วย Chrome'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = 'พร้อมแล้ว • ลงสนาม';
    }
  }
  document.getElementById('frontDeploy').addEventListener('click', deploy);
  window.showNovaFrontMenu = () => { front.hidden = false; changeView('home'); };
  document.addEventListener('click', event => {
    if (event.target.closest('#n3dBack')) setTimeout(() => window.showNovaFrontMenu(), 40);
  });
  chooseMode(selectedMode);
  chooseCharacter(selectedCharacter, characters.find(item => item[0] === selectedCharacter)?.[1] || 'ผู้เล่น');
  document.body.classList.add('nova-front-open');
})();
