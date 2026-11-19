(() => {
  Object.assign(zoneInfo, {
    world3d: { kicker: 'NOVA CITY • โลกสามมิติ', title: 'โลกกว้าง<br>มุมมอง 360°', text: 'สำรวจแผนที่ 3D ที่เชื่อมหมู่บ้าน สนามยิง มวย ดาบ สนามแข่งและอู่รถ • โหมดขับเปิดจากประตูสนาม • บอท AI จำลอง', button: 'เข้าโลก 3D' },
    race3d: { kicker: 'NOVA CITY • สนามแข่ง 3D', title: 'ขับรถจริง<br>บนสนาม 3D', text: 'เร่ง เบรก เลี้ยว และหมุนกล้องดูรอบรถได้เต็ม 360° บนจอมือถือ', button: 'เริ่มขับรถ 3D' },
    builder3d: { kicker: 'NOVA CITY • สร้างสนาม 3D', title: 'ออกแบบสนาม<br>ของคุณเอง', text: 'แตะเพื่อวางกำแพง ลัง กรวย หรือถัง แล้วบันทึกไว้ในเครื่องและลองเล่นในโลก 3D', button: 'สร้างสนาม 3D' },
    battle2d: { kicker: 'เวอร์ชันเดิม • 2D', title: 'สนามต่อสู้ 2D<br>รุ่นทดลองเดิม', text: 'เก็บรุ่น 2D เดิมไว้เป็นทางเลือกสำรอง', button: 'เปิดรุ่น 2D' }
  });
  const grid = document.getElementById('zoneGrid');
  const battleCard = document.querySelector('.zone[data-zone="battle"]');
  if (battleCard) { battleCard.querySelector('strong').textContent='แบตเทิลรอยัล 3D'; battleCard.querySelector('span').textContent='วงปลอดภัย • เก็บของ • สู้ AI'; }
  if (grid) {
    if (!grid.querySelector('[data-zone="world3d"]')) grid.insertAdjacentHTML('beforeend','<button class="zone" data-zone="world3d" onclick="selectZone(\'world3d\',this)"><div class="zone-icon">🌄</div><strong>โลกกว้าง 3D</strong><span>แผนที่ 3D • สนามแข่ง/อู่รถ • ต่อสู้ AI</span></button>');
    if (!grid.querySelector('[data-zone="race3d"]')) grid.insertAdjacentHTML('beforeend','<button class="zone" data-zone="race3d" onclick="selectZone(\'race3d\',this)"><div class="zone-icon">🏎️</div><strong>ขับรถ / แข่ง 3D</strong><span>บังคับรถจริง • เร่ง • เบรก • เลี้ยว</span></button>');
    if (!grid.querySelector('[data-zone="builder3d"]')) grid.insertAdjacentHTML('beforeend','<button class="zone" data-zone="builder3d" onclick="selectZone(\'builder3d\',this)"><div class="zone-icon">🧱</div><strong>สร้างสนาม 3D</strong><span>วางสิ่งกีดขวาง • บันทึก • ทดลองเล่น</span></button>');
    if (!grid.querySelector('[data-zone="battle2d"]')) grid.insertAdjacentHTML('beforeend','<button class="zone" data-zone="battle2d" onclick="selectZone(\'battle2d\',this)"><div class="zone-icon">🕹️</div><strong>สนามต่อสู้ 2D เดิม</strong><span>รุ่นสำรองจากต้นแบบก่อนหน้า</span></button>');
  }
  const priorEnter = window.enterZone;
  async function load3D(kind) {
    try {
      if (kind === 'world') {
        if (!window.nova3DWorld) await import('./nova-3d-world.js');
        window.nova3DWorld.open(); if(kind==='world'&&currentZone==='battle')window.nova3DWorld.setZone('shooting'); appendRacePortal();
      } else if (kind === 'builder') {
        if (!window.nova3DBuilder) await import('./nova-3d-builder.js');
        window.nova3DBuilder.open();
      } else {
        if (!window.nova3DRace) await import('./nova-3d-driving.js');
        window.nova3DRace.open();
      }
    } catch (error) {
      toast('3D ยังโหลดไม่สำเร็จ กรุณาเปิดหน้าใหม่ด้วย Chrome');
    }
  }
  function appendRacePortal() {
    const bar = document.querySelector('#nova3dWorld .n3d-zones'); if (!bar) return;
    if (!bar.querySelector('[data-zone="race3d"]')) { const button=document.createElement('button');button.type='button';button.dataset.zone='race3d';button.textContent='🏁 แข่งรถ 3D';button.addEventListener('click',()=>load3D('race'));bar.appendChild(button); }
    if (!bar.querySelector('[data-zone="builder3d"]')) { const button=document.createElement('button');button.type='button';button.dataset.zone='builder3d';button.textContent='🧱 สร้างสนาม 3D';button.addEventListener('click',()=>load3D('builder'));bar.appendChild(button); }
  }
  window.enterZone = function () {
    if (window.nova3DWorld?.isOpen && !['world3d','battle'].includes(currentZone)) window.nova3DWorld.close();
    if (window.nova3DRace?.isOpen && currentZone !== 'race3d' && currentZone !== 'world3d' && currentZone !== 'battle') window.nova3DRace.close();
    if (currentZone === 'world3d' || currentZone === 'battle') return load3D('world');
    if (currentZone === 'race3d') return load3D('race');
    if (currentZone === 'builder3d') return load3D('builder');
    if (currentZone === 'battle2d') return window.openNovaBattle ? window.openNovaBattle() : priorEnter();
    return priorEnter();
  };
  if (typeof window.novaGo === 'function') {
    const priorGo=window.novaGo;
    window.novaGo=function(id){if(window.nova3DWorld?.isOpen&&!['world3d','battle'].includes(id))window.nova3DWorld.close();if(window.nova3DRace?.isOpen&&!['race3d','world3d','battle'].includes(id))window.nova3DRace.close();return priorGo(id);};
  }
})();
