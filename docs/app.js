const appRoot = document.getElementById('app');
const state = { user: null, page: 'overview', pets: [], applications: [], appointments: [], contracts: [], healthRecords: [], followUps: [], search: '', petFilter: 'ทั้งหมด' };
const dimensions = [
  { title: 'สถานที่เลี้ยง', description: 'มีพื้นที่ปลอดภัย เหมาะกับชนิดและขนาดของสัตว์', icon: '⌂' },
  { title: 'ประสบการณ์และเวลา', description: 'มีเวลาดูแลทุกวัน และเข้าใจความรับผิดชอบระยะยาว', icon: '◷' },
  { title: 'ความพร้อมทางการเงิน', description: 'รองรับค่าอาหาร วัคซีน และค่ารักษาพยาบาล', icon: '฿' },
  { title: 'ความยินยอมของเจ้าของสถานที่', description: 'เจ้าของบ้านหรือหอพักอนุญาตให้เลี้ยงสัตว์', icon: '♡' },
  { title: 'แผนดูแลหลังเรียนจบ', description: 'มีแผนดูแลต่อเนื่องเมื่อย้ายที่อยู่หรือจบการศึกษา', icon: '↗' }
];
const navItems = [
  { id: 'overview', label: 'ภาพรวม', icon: '⌂' }, { id: 'pets', label: 'สัตว์หาบ้าน', icon: '🐾' },
  { id: 'applications', label: 'คำขอของฉัน', icon: '▤' }, { id: 'appointments', label: 'นัดหมาย', icon: '▦' },
  { id: 'health', label: 'สุขภาพและวัคซีน', icon: '✚' }, { id: 'followups', label: 'ติดตามหลังรับเลี้ยง', icon: '↗' }
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const shortDate = value => value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', ...(value.includes('T') ? { timeStyle: 'short' } : {}) }).format(new Date(value)) : 'ยังไม่ระบุ';
const statusClass = status => ({ 'พร้อมหาบ้าน': 'green', 'รอตรวจสอบ': 'amber', 'นัดสัมภาษณ์': 'blue', 'อนุมัติ': 'green', 'ไม่ผ่าน': 'rose', 'ทำสัญญาแล้ว': 'violet', 'รับเลี้ยงแล้ว': 'teal', 'มีผู้รับเลี้ยงแล้ว': 'slate' }[status] || 'slate');
const statusTag = status => `<span class="status-tag ${statusClass(status)}">${esc(status)}</span>`;
const initials = name => (name || 'สมาชิก').trim().slice(0, 1).toUpperCase();

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'ไม่สามารถเชื่อมต่อระบบได้');
  return payload;
}

async function refresh() {
  const data = await api('/api/bootstrap');
  Object.assign(state, data);
  render();
}

function toast(message, type = 'success') {
  const region = document.getElementById('toast-region');
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  region.appendChild(item);
  setTimeout(() => item.remove(), 3800);
}

function renderLogin(mode = 'login', initialEmail = '') {
  const registering = mode === 'register';
  appRoot.innerHTML = `
    <main class="login-shell">
      <section class="login-art">
        <div class="login-brand"><span class="brand-mark">🐾</span><div><b>บ้านอุ่นใจ</b><small>RMUTL PET SHELTER</small></div></div>
        <div class="login-message"><span class="eyebrow">มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา · เชียงใหม่</span><h1>ทุกชีวิต<br>สมควรมี<span>บ้านที่อบอุ่น</span></h1><p>พื้นที่เล็ก ๆ ที่เชื่อมโยงผู้คนและเพื่อนสี่ขา พร้อมระบบคัดกรองที่ใส่ใจในทุกขั้นตอน</p><div class="login-quote"><span>“</span><div><b>เพราะการรับเลี้ยง คือคำสัญญาตลอดชีวิต</b><small>ระบบจัดการศูนย์พักพิงสัตว์ · กลุ่ม 9 อยากกินลาบ</small></div></div></div>
        <div class="login-bottom"><span>เชียงใหม่, ประเทศไทย</span><span>ดูแลด้วยใจ · ตั้งแต่วันแรก</span></div>
      </section>
      <section class="login-panel"><div class="login-form-wrap"><span class="eyebrow green-text">${registering ? 'มาเป็นส่วนหนึ่งของบ้านอุ่นใจ' : 'ยินดีต้อนรับ'}</span><h2>${registering ? 'สมัครสมาชิก' : 'เข้าสู่บ้านอุ่นใจ'}</h2><p class="muted">${registering ? 'สร้างบัญชีด้วยอีเมลมหาวิทยาลัย เพื่อเริ่มต้นดูแลเพื่อนสี่ขา' : 'ใช้บัญชีอีเมลมหาวิทยาลัยเพื่อเข้าใช้งาน'}</p>
        ${registering ? `<form id="register-form" class="form-stack"><label>ชื่อ - นามสกุล<input name="name" placeholder="ชื่อที่ใช้แสดงในระบบ" autocomplete="name" required minlength="2" maxlength="80"></label><label>อีเมลมหาวิทยาลัย<div class="input-icon"><span>✉</span><input name="email" type="email" placeholder="ชื่อผู้ใช้@rmutl.ac.th" autocomplete="email" required pattern="[^@\\s]+@rmutl\\.ac\\.th"></div></label><label>รหัสยืนยัน<div class="input-icon"><span>⌑</span><input name="code" inputmode="numeric" placeholder="รหัส 6 หลัก" required maxlength="6"></div></label><div class="demo-hint"><span>ⓘ</span><span><b>โหมดสาธิต</b> — ใช้รหัส <code>123456</code> · ต้องใช้อีเมล <code>@rmutl.ac.th</code></span></div><label class="check-line"><input type="checkbox" name="consent" required><span>ยินยอมให้ใช้ข้อมูลบัญชีเพื่อการสมัครและติดต่อเกี่ยวกับคำขอรับเลี้ยง</span></label><button class="button primary full" type="submit">สร้างบัญชีสมาชิก <span>→</span></button><p class="login-terms">การสมัครนี้เป็นโหมดสาธิต ยังไม่ได้เชื่อมต่อระบบยืนยันตัวตนจริงของมหาวิทยาลัย</p><p class="auth-switch">มีบัญชีอยู่แล้ว? <button type="button" data-action="switch-auth" data-mode="login">เข้าสู่ระบบ</button></p></form>` : `<form id="login-form" class="form-stack"><label>ชื่อที่ใช้แสดง<input name="name" placeholder="ชื่อ - นามสกุล" autocomplete="name" maxlength="80"></label><label>อีเมลมหาวิทยาลัย<div class="input-icon"><span>✉</span><input name="email" type="email" placeholder="ชื่อผู้ใช้@rmutl.ac.th" autocomplete="email" required value="${esc(initialEmail)}"></div></label><label>รหัสยืนยัน<div class="input-icon"><span>⌑</span><input name="code" inputmode="numeric" placeholder="รหัส 6 หลัก" required maxlength="6"></div></label><div class="demo-hint"><span>ⓘ</span><span><b>โหมดสาธิต</b> — ใช้รหัส <code>123456</code> · ผู้ดูแลระบบใช้ <code>admin@rmutl.ac.th</code></span></div><button class="button primary full" type="submit">เข้าสู่ระบบ <span>→</span></button><p class="login-terms">การเข้าสู่ระบบแสดงว่าคุณยอมรับเงื่อนไขการใช้บริการและนโยบายความเป็นส่วนตัว</p><p class="auth-switch">ยังไม่มีบัญชี? <button type="button" data-action="switch-auth" data-mode="register">สมัครสมาชิก</button></p></form>`}
      </div><div class="login-campus-note">🔒 ข้อมูลของคุณได้รับการดูแลอย่างปลอดภัย</div></section>
    </main>`;
}

function renderShell() {
  const items = [...navItems, ...(state.user.role === 'admin' ? [{ id: 'dashboard', label: 'แดชบอร์ดผู้บริหาร', icon: '▥' }] : [])];
  appRoot.innerHTML = `<div class="app-layout">
    <aside class="sidebar"><a class="side-brand" href="#" data-page="overview"><span class="brand-mark">🐾</span><span><b>บ้านอุ่นใจ</b><small>RMUTL PET SHELTER</small></span></a>
      <div class="campus-pill"><span class="campus-dot"></span> มทร.ล้านนา เชียงใหม่</div>
      <div class="side-label">เมนูหลัก</div><nav class="side-nav">${items.map(item => `<button class="nav-link ${state.page === item.id ? 'active' : ''}" data-page="${item.id}"><span class="nav-icon">${item.icon}</span>${item.label}${item.id === 'applications' && state.user.role === 'admin' ? `<span class="nav-count">${state.applications.filter(application => application.status === 'รอตรวจสอบ').length}</span>` : ''}</button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="help-card"><span class="help-icon">♡</span><b>ต้องการความช่วยเหลือ?</b><p>ทีมงานศูนย์พักพิงพร้อมดูแลคุณ</p><a href="mailto:animalcare@rmutl.ac.th">ติดต่อทีมงาน ↗</a></div><div class="scrum-mini"><span class="pulse"></span> ระบบพร้อมใช้งาน <small>กลุ่ม 9 · อยากกินลาบ</small></div></div>
    </aside>
    <div class="main-column"><header class="topbar"><div class="mobile-brand"><span class="brand-mark">🐾</span><b>บ้านอุ่นใจ</b></div><div class="breadcrumb"><span>ศูนย์พักพิงสัตว์</span><span>/</span><b>${esc(items.find(item => item.id === state.page)?.label || 'ภาพรวม')}</b></div><div class="top-actions"><span class="top-campus">เชียงใหม่ <span class="campus-dot"></span></span><button class="profile-button" data-action="profile"><span class="avatar">${esc(initials(state.user.name))}</span><span class="profile-info"><b>${esc(state.user.name)}</b><small>${state.user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิกมหาวิทยาลัย'}</small></span><span class="chevron">⌄</span></button><button class="icon-button logout-button" data-action="logout" aria-label="ออกจากระบบ" title="ออกจากระบบ">↪</button></div></header><main class="page-content" id="page-content"></main><footer class="footer"><span>© 2026 บ้านอุ่นใจ · มทร.ล้านนา เชียงใหม่</span><span>พัฒนาโดย กลุ่ม 9 (อยากกินลาบ)</span></footer></div>
  </div><div id="modal-root"></div>`;
  renderPage();
}

function render() { state.user ? renderShell() : renderLogin(); }
function pageHeader(eyebrow, title, subtitle, action = '') { return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; }
function emptyState(icon, title, text) { return `<div class="empty-state"><span>${icon}</span><b>${title}</b><p>${text}</p></div>`; }
function metric(icon, label, value, hint, color) { return `<article class="metric-card"><span class="metric-icon ${color}">${icon}</span><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-hint">${hint}</div></article>`; }

function petCard(pet) {
  const hasApplied = state.applications.some(application => application.petId === pet.id && application.email === state.user.email);
  const unavailable = pet.status !== 'พร้อมหาบ้าน';
  return `<article class="pet-card"><div class="pet-photo"><img src="${esc(pet.image)}" alt="${esc(pet.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900'"><span class="pet-type">${esc(pet.species || 'สัตว์เลี้ยง')}</span>${statusTag(pet.status)}</div><div class="pet-body"><div class="pet-title-row"><div><h3>${esc(pet.name)}</h3><p>${esc(pet.breed)} · ${esc(pet.age)}</p></div><span class="pet-paw">🐾</span></div><div class="pet-facts"><span>📍 ${esc(pet.zone || 'ไม่ระบุโซน')}</span><span>♡ ${esc(pet.sex || 'ไม่ระบุ')}</span></div><p class="pet-note">${esc(pet.behavior || 'กำลังรอพบครอบครัวใหม่')}</p><div class="pet-card-bottom"><button class="button ${unavailable || hasApplied ? 'soft' : 'primary'} small" data-action="${unavailable || hasApplied ? 'pet-details' : 'apply'}" data-id="${esc(pet.id)}">${hasApplied ? 'ส่งคำขอแล้ว' : unavailable ? 'ดูรายละเอียด' : 'ทำความรู้จัก'} <span>→</span></button>${state.user.role === 'admin' ? `<button class="text-button" data-action="edit-pet" data-id="${esc(pet.id)}">แก้ไข</button>` : ''}</div></div></article>`;
}

function renderOverview() {
  const myApps = state.applications.filter(item => item.email === state.user.email);
  const pending = myApps.filter(item => !['ไม่ผ่าน', 'รับเลี้ยงแล้ว'].includes(item.status));
  const upcoming = state.appointments.filter(item => new Date(item.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const available = state.pets.filter(pet => pet.status === 'พร้อมหาบ้าน');
  return `${pageHeader('วันจันทร์ที่แสนอบอุ่น', `สวัสดี${state.user.name ? `, ${esc(state.user.name)}` : ''} 👋`, 'ทุกการเริ่มต้นที่ดี เริ่มจากการได้พบกัน', '<span class="today-pill">☀ &nbsp; บ้านใหม่เริ่มต้นได้ที่นี่</span>')}
    <section class="welcome-banner"><div class="welcome-copy"><span class="eyebrow light">ทุกชีวิตมีเรื่องราว</span><h2>บางที…เพื่อนที่ดีที่สุด<br>ของคุณอาจกำลังรออยู่</h2><p>พบเพื่อนสี่ขาที่กำลังมองหาบ้านแสนอบอุ่นในรั้วมหาวิทยาลัย</p><button class="button white" data-page="pets">ค้นหาเพื่อนใหม่ <span>→</span></button></div><div class="welcome-art"><div class="sun-disc"></div><div class="welcome-pet">🐕</div><div class="floating-heart">♥</div><div class="welcome-leaf leaf-one">✿</div><div class="welcome-leaf leaf-two">✿</div><div class="welcome-ground"></div></div><div class="banner-stamp">เลี้ยงด้วยรัก<br><b>ตลอดไป</b> ♡</div></section>
    <section class="metric-grid">${metric('🐾', 'เพื่อนที่กำลังรอบ้าน', available.length, 'สัตว์เลี้ยงพร้อมพบคุณ', 'mint')}${metric('▤', 'คำขอของฉัน', myApps.length, pending.length ? `${pending.length} รายการกำลังดำเนินการ` : 'เริ่มต้นเรื่องราวดี ๆ วันนี้', 'peach')}${metric('▦', 'นัดหมายครั้งถัดไป', upcoming ? shortDate(upcoming.date) : '—', upcoming ? upcoming.type : 'ยังไม่มีนัดหมาย', 'lavender')}</section>
    <section class="section-block"><div class="section-heading"><div><span class="eyebrow">เพื่อนใหม่ของเรา</span><h2>กำลังรอบ้านที่อบอุ่น</h2><p>ทุกตัวมีเรื่องราว และกำลังรอเขียนบทต่อไปกับคุณ</p></div><button class="text-button" data-page="pets">ดูทั้งหมด <span>→</span></button></div><div class="pet-grid">${available.slice(0, 3).map(petCard).join('') || emptyState('🐾', 'ยังไม่มีสัตว์ที่เปิดรับเลี้ยง', 'กลับมาดูใหม่อีกครั้งเร็ว ๆ นี้')}</div></section>
    <section class="bottom-panels"><article class="panel process-panel"><div class="panel-title"><div><span class="eyebrow">ง่ายและใส่ใจ</span><h3>ขั้นตอนการรับเลี้ยง</h3></div><span class="panel-emoji">🌱</span></div><div class="process-steps"><div><span>01</span><b>เลือกเพื่อน</b><small>ทำความรู้จักสัตว์เลี้ยง</small></div><i></i><div><span>02</span><b>ประเมินความพร้อม</b><small>ตอบคำถาม 5 มิติ</small></div><i></i><div><span>03</span><b>พบกันและรับเลี้ยง</b><small>สัมภาษณ์ เซ็นสัญญา</small></div></div></article><article class="panel appointment-panel"><div class="panel-title"><div><span class="eyebrow">กิจกรรมของคุณ</span><h3>นัดหมายเร็ว ๆ นี้</h3></div><span class="panel-emoji">🗓</span></div>${upcoming ? `<div class="appointment-mini"><span class="calendar-icon">${new Date(upcoming.date).getDate()}</span><div><b>${esc(upcoming.type)} · ${esc(upcoming.petName)}</b><small>${shortDate(upcoming.date)} · ${esc(upcoming.location)}</small></div></div>` : `<p class="muted small-copy">ยังไม่มีนัดหมาย เมื่อคำขอได้รับอนุมัติ คุณจะสามารถเลือกเวลาสัมภาษณ์ได้</p>`}<button class="text-button" data-page="appointments">${upcoming ? 'ดูนัดหมายทั้งหมด' : 'ทำความรู้จักระบบ'} →</button></article></section>`;
}

function renderPets() {
  const filtered = state.pets.filter(pet => `${pet.name} ${pet.breed} ${pet.zone} ${pet.species}`.toLowerCase().includes(state.search.toLowerCase()) && (state.petFilter === 'ทั้งหมด' || pet.status === state.petFilter));
  return `${pageHeader('พบกันตรงกลาง', 'เพื่อนที่กำลังรอบ้าน', 'เลือกทำความรู้จักสัตว์เลี้ยงในรั้ว มทร.ล้านนา เชียงใหม่', state.user.role === 'admin' ? '<button class="button primary" data-action="add-pet">＋ เพิ่มข้อมูลสัตว์</button>' : '')}<section class="catalog-toolbar"><label class="search-box"><span>⌕</span><input id="pet-search" value="${esc(state.search)}" placeholder="ค้นหาชื่อ สายพันธุ์ หรือโซน…"></label><label class="filter-select"><span>แสดง</span><select id="pet-filter"><option ${state.petFilter === 'ทั้งหมด' ? 'selected' : ''}>ทั้งหมด</option><option ${state.petFilter === 'พร้อมหาบ้าน' ? 'selected' : ''}>พร้อมหาบ้าน</option><option ${state.petFilter === 'กำลังหาผู้รับเลี้ยง' ? 'selected' : ''}>กำลังหาผู้รับเลี้ยง</option><option ${state.petFilter === 'มีผู้รับเลี้ยงแล้ว' ? 'selected' : ''}>มีผู้รับเลี้ยงแล้ว</option></select></label><span class="results-count">${filtered.length} รายการ</span></section><div class="pet-grid catalog-grid">${filtered.map(petCard).join('') || emptyState('⌕', 'ไม่พบเพื่อนที่ค้นหา', 'ลองใช้คำค้นอื่น หรือเปลี่ยนตัวกรอง')}</div>`;
}

function timeline(status) {
  const sequence = ['รอตรวจสอบ', 'นัดสัมภาษณ์', 'อนุมัติ', 'ทำสัญญาแล้ว', 'รับเลี้ยงแล้ว'];
  const index = sequence.indexOf(status);
  return `<div class="application-timeline">${sequence.map((label, step) => `<div class="timeline-step ${index >= step ? 'done' : ''} ${index === step ? 'current' : ''}"><span>${index > step ? '✓' : String(step + 1).padStart(2, '0')}</span><small>${label}</small></div>`).join('')}</div>`;
}

function applicationCard(application) {
  const admin = state.user.role === 'admin';
  const contract = state.contracts.find(item => item.applicationId === application.id);
  return `<article class="application-card"><div class="application-top"><div class="application-pet-icon">🐾</div><div class="application-title"><b>${esc(application.petName)}</b><small>${esc(application.applicantName)} · ${shortDate(application.createdAt)}</small></div>${statusTag(application.status)}</div>${admin ? `<div class="review-facts"><span>✉ ${esc(application.email)}</span><span>⌂ ${esc(application.location)}</span><span>คะแนนความพร้อม <b>${application.score}%</b></span></div><p class="review-note">${esc(application.note || 'ไม่มีหมายเหตุเพิ่มเติม')}</p><div class="review-actions"><select data-review-status="${esc(application.id)}"><option ${application.status === 'รอตรวจสอบ' ? 'selected' : ''}>รอตรวจสอบ</option><option ${application.status === 'นัดสัมภาษณ์' ? 'selected' : ''}>นัดสัมภาษณ์</option><option ${application.status === 'อนุมัติ' ? 'selected' : ''}>อนุมัติ</option><option ${application.status === 'ไม่ผ่าน' ? 'selected' : ''}>ไม่ผ่าน</option><option ${application.status === 'ทำสัญญาแล้ว' ? 'selected' : ''}>ทำสัญญาแล้ว</option><option ${application.status === 'รับเลี้ยงแล้ว' ? 'selected' : ''}>รับเลี้ยงแล้ว</option></select><button class="button soft small" data-action="save-review" data-id="${esc(application.id)}">บันทึกผล</button><button class="button outline small" data-action="schedule" data-id="${esc(application.id)}">＋ นัดสัมภาษณ์</button></div>` : `<p class="application-description">${esc(application.note || 'ขอบคุณที่เปิดโอกาสให้เพื่อนสี่ขาได้มีบ้านที่อบอุ่น')}</p>${timeline(application.status)}<div class="application-actions">${application.status === 'อนุมัติ' ? `<button class="button primary small" data-action="sign-contract" data-id="${esc(application.id)}">${contract ? 'ดูสัญญาที่ลงนามแล้ว' : 'ตรวจสอบและลงนามสัญญา'} →</button><button class="button outline small" data-action="schedule" data-id="${esc(application.id)}" data-type="ส่งมอบ">นัดรับมอบสัตว์</button>` : ''}${application.status === 'ทำสัญญาแล้ว' ? `<button class="button primary small" data-action="schedule" data-id="${esc(application.id)}" data-type="ส่งมอบ">นัดหมายรับมอบ →</button>` : ''}${application.status === 'รับเลี้ยงแล้ว' ? `<button class="button primary small" data-page="followups">บันทึกความเป็นอยู่ →</button>` : ''}</div>`}</article>`;
}

function renderApplications() {
  const records = state.applications;
  const title = state.user.role === 'admin' ? 'คำขอรับเลี้ยงทั้งหมด' : 'เรื่องราวการรับเลี้ยงของฉัน';
  return `${pageHeader('ทุกการเริ่มต้นมีความหมาย', title, state.user.role === 'admin' ? 'ตรวจสอบความพร้อม พิจารณาคำขอ และนัดสัมภาษณ์ผู้รับเลี้ยง' : 'ติดตามสถานะและขั้นตอนของคำขอรับเลี้ยงของคุณ')}${records.length ? `<div class="application-list">${records.map(applicationCard).join('')}</div>` : emptyState('▤', 'ยังไม่มีคำขอรับเลี้ยง', 'เมื่อพบเพื่อนที่ใช่ สามารถเริ่มทำแบบประเมินความพร้อมได้จากหน้าสัตว์หาบ้าน')}</div>`;
}

function renderAppointments() {
  const rows = [...state.appointments].sort((a, b) => new Date(a.date) - new Date(b.date));
  return `${pageHeader('ปฏิทินนัดหมาย', 'เวลาของการได้พบกัน', 'วางแผนสัมภาษณ์ ทำความรู้จัก และนัดรับมอบสัตว์เลี้ยง', state.user.role === 'admin' && state.applications.length ? '<button class="button primary" data-action="schedule">＋ เพิ่มนัดหมาย</button>' : '')}<section class="appointment-banner"><div><span class="eyebrow light">A LITTLE TIME, A LOT OF LOVE</span><h2>ทุกการพบกัน คือก้าวสำคัญ</h2><p>ทีมงานจะช่วยประสานวันและเวลาที่สะดวกสำหรับทุกคน</p></div><div class="appointment-banner-icon">📆</div></section><div class="appointment-list">${rows.length ? rows.map(item => `<article class="appointment-card"><div class="appointment-date"><b>${new Date(item.date).getDate()}</b><small>${new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(new Date(item.date))}</small></div><div class="appointment-main"><span class="eyebrow">${esc(item.type)} · ${esc(item.petName)}</span><h3>${esc(item.type === 'สัมภาษณ์' ? 'นัดพูดคุยและประเมินความพร้อม' : 'นัดหมายส่งมอบสมาชิกใหม่')}</h3><p>◷ ${shortDate(item.date)} &nbsp; · &nbsp; 📍 ${esc(item.location)}</p>${state.user.role === 'admin' ? `<small class="muted">ผู้ขอ: ${esc(item.email)}</small>` : ''}</div><span class="status-tag blue">${new Date(item.date) < new Date() ? 'ผ่านไปแล้ว' : 'กำหนดแล้ว'}</span></article>`).join('') : emptyState('▦', 'ยังไม่มีนัดหมาย', state.user.role === 'admin' ? 'นัดสัมภาษณ์ได้จากรายการคำขอรับเลี้ยง' : 'เมื่อคำขอได้รับอนุมัติ คุณจะสามารถนัดสัมภาษณ์กับทีมงานได้')}</div>`;
}

function renderHealth() {
  const rows = [...state.healthRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
  const action = state.user.role === 'admin' ? '<button class="button primary" data-action="add-health">＋ บันทึกประวัติ</button>' : '';
  return `${pageHeader('สุขภาพที่ดี เริ่มจากการใส่ใจ', 'สมุดสุขภาพดิจิทัล', 'บันทึกการตรวจรักษา วัคซีน และนัดหมายดูแลสุขภาพ', action)}<div class="health-summary"><div class="health-summary-icon">✚</div><div><b>ดูแลเขาเหมือนสมาชิกในครอบครัว</b><p>ทีมงานบันทึกประวัติสุขภาพเพื่อให้การดูแลต่อเนื่อง แม้เปลี่ยนบ้านแล้ว</p></div><span class="health-shield">✦</span></div><div class="health-list">${rows.length ? rows.map(item => `<article class="health-row"><div class="health-type-icon ${item.type === 'วัคซีน' ? 'vaccine' : ''}">${item.type === 'วัคซีน' ? '⌁' : '✚'}</div><div class="health-row-main"><div class="health-title-line"><b>${esc(item.petName)}</b><span class="status-tag ${item.type === 'วัคซีน' ? 'green' : 'blue'}">${esc(item.type)}</span></div><p>${esc(item.detail)}</p><small>${shortDate(item.date)}${item.nextDate ? ` · นัดครั้งถัดไป ${shortDate(item.nextDate)}` : ''}</small></div></article>`).join('') : emptyState('✚', 'ยังไม่มีบันทึกสุขภาพ', 'ประวัติวัคซีนและการตรวจสุขภาพจะแสดงที่นี่')}</div>`;
}

function renderFollowups() {
  const rows = [...state.followUps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const adopted = state.applications.filter(item => item.status === 'รับเลี้ยงแล้ว');
  const action = state.user.role === 'admin' ? '' : adopted.length ? `<button class="button primary" data-action="add-followup">＋ อัปเดตความเป็นอยู่</button>` : '';
  return `${pageHeader('เพราะความห่วงใยไม่จบแค่วันรับเลี้ยง', 'บันทึกการเติบโต', 'แบ่งปันภาพและเรื่องราว เพื่อให้ทีมงานรู้ว่าเพื่อนตัวน้อยสบายดี', action)}<section class="followup-banner"><span>🌼</span><div><b>ทุกภาพคือความทรงจำที่มีค่า</b><p>${state.user.role === 'admin' ? 'บันทึกติดตามผลจากครอบครัวผู้รับเลี้ยง เพื่อป้องกันการทอดทิ้งซ้ำ' : adopted.length ? 'อัปโหลดรูปหรือเล่าเรื่องเล็ก ๆ ให้ทีมงานได้ชื่นใจไปกับคุณ' : 'หลังรับเลี้ยงแล้ว คุณจะสามารถส่งภาพและอัปเดตความเป็นอยู่ได้ที่นี่'}</p></div></section><div class="followup-grid">${rows.length ? rows.map(item => `<article class="followup-card">${item.photo ? `<img class="followup-photo" src="${esc(item.photo)}" alt="ภาพอัปเดต ${esc(item.petName)}">` : `<div class="followup-photo placeholder-photo">🐾</div>`}<div class="followup-content"><div class="followup-meta"><b>${esc(item.petName)}</b><span>${shortDate(item.createdAt)}</span></div><p>${esc(item.note || 'ส่งภาพความเป็นอยู่')}</p><div class="followup-bottom"><span>อารมณ์วันนี้: ${esc(item.mood)}</span>${state.user.role === 'admin' ? `<small>${esc(item.email)}</small>` : ''}</div></div></article>`).join('') : emptyState('♡', 'เรื่องราวบทใหม่กำลังรออยู่', 'อัปเดตความเป็นอยู่ครั้งแรก แล้วมาแบ่งปันความสุขกัน')}</div>`;
}

function renderDashboard() {
  const adopted = state.applications.filter(item => item.status === 'รับเลี้ยงแล้ว').length;
  const pending = state.applications.filter(item => item.status === 'รอตรวจสอบ').length;
  const available = state.pets.filter(item => item.status === 'พร้อมหาบ้าน').length;
  const adoptionRate = state.applications.length ? Math.round(adopted / state.applications.length * 100) : 0;
  const sprint = [
    ['Sprint 01', 'ทะเบียนสัตว์ · แค็ตตาล็อก · แบบคัดกรอง', 'พร้อมใช้งาน', 100],
    ['Sprint 02', 'ตรวจเอกสาร · นัดสัมภาษณ์ · พิจารณา', 'พร้อมใช้งาน', 100],
    ['Sprint 03', 'สัญญาดิจิทัล · นัดส่งมอบ · สมุดสุขภาพ', 'พร้อมใช้งาน', 100],
    ['Sprint 04', 'ติดตามผล · สถิติ · ความปลอดภัย', 'กำลังดำเนินการ', 82]
  ];
  return `${pageHeader('ภาพรวมศูนย์พักพิง · 2026', 'แดชบอร์ดผู้บริหาร', 'ข้อมูลเพื่อการดูแลที่ดีขึ้น และการรับเลี้ยงที่ยั่งยืน', '<span class="today-pill">อัปเดตแบบเรียลไทม์ <i class="pulse"></i></span>')}<section class="dashboard-hero"><div><span class="eyebrow light">ศูนย์พักพิงสัตว์ · มทร.ล้านนา เชียงใหม่</span><h2>ทุกตัวเลข คืออีกหนึ่งชีวิตที่ได้รับโอกาส</h2><p>สรุปภาพรวมการดำเนินงานและกระบวนการรับเลี้ยง</p></div><div class="dashboard-hero-paw">🐾</div></section><div class="metric-grid admin-metrics">${metric('🐾', 'สัตว์ในระบบ', state.pets.length, `${available} ตัวเปิดรับเลี้ยง`, 'mint')}${metric('▤', 'คำขอทั้งหมด', state.applications.length, `${pending} รายการรอตรวจสอบ`, 'peach')}${metric('♡', 'รับเลี้ยงสำเร็จ', adopted, 'ชีวิตใหม่ในบ้านแสนอบอุ่น', 'lavender')}${metric('↗', 'อัตรารับเลี้ยงสำเร็จ', `${adoptionRate}%`, 'จากคำขอทั้งหมด', 'blue')}</div><div class="dashboard-columns"><section class="panel dashboard-table-panel"><div class="panel-title"><div><span class="eyebrow">ต้องดูแลต่อ</span><h3>คำขอล่าสุด</h3></div><button class="text-button" data-page="applications">ดูทั้งหมด →</button></div>${state.applications.slice(0, 5).map(item => `<div class="dashboard-application"><span class="application-pet-icon small-pet">🐾</span><div><b>${esc(item.petName)}</b><small>${esc(item.applicantName)} · ${shortDate(item.createdAt)}</small></div>${statusTag(item.status)}</div>`).join('') || emptyState('▤', 'ยังไม่มีคำขอ', 'เมื่อมีผู้สมัคร รายการจะแสดงตรงนี้')}</section><section class="panel sprint-panel"><div class="panel-title"><div><span class="eyebrow">แผนการพัฒนา</span><h3>Scrum · 4 Sprints</h3></div><span class="sprint-capacity">240 ชม. / Sprint</span></div><div class="sprint-list">${sprint.map(([id, title, status, progress]) => `<div class="sprint-row"><div><span class="sprint-id">${id}</span><span class="sprint-status ${status === 'พร้อมใช้งาน' ? 'done' : ''}">${status}</span></div><b>${title}</b><div class="progress-track"><span style="width:${progress}%"></span></div><small>${progress}% · 2 สัปดาห์ / 10 วันทำการ</small></div>`).join('')}</div><div class="dod-note">✓ Definition of Ready · Code Review · Test coverage ≥ 80%</div></section></div>`;
}

function renderPage() {
  const pages = { overview: renderOverview, pets: renderPets, applications: renderApplications, appointments: renderAppointments, health: renderHealth, followups: renderFollowups, dashboard: renderDashboard };
  if (state.page === 'dashboard' && state.user.role !== 'admin') state.page = 'overview';
  document.getElementById('page-content').innerHTML = (pages[state.page] || renderOverview)();
}

function modal(title, subtitle, body, size = '') {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="backdrop"><section class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-header"><div><span class="eyebrow">บ้านอุ่นใจ · ศูนย์พักพิงสัตว์</span><h2>${title}</h2><p>${subtitle}</p></div><button class="modal-close" data-action="close-modal" aria-label="ปิด">×</button></header><div class="modal-content">${body}</div></section></div>`;
  root.querySelector('.modal').addEventListener('click', event => event.stopPropagation());
}

function openApplication(petId) {
  const pet = state.pets.find(item => item.id === petId);
  if (!pet) return;
  modal(`เริ่มต้นบทใหม่กับ${esc(pet.name)}`, 'ตอบคำถามเพื่อช่วยให้เราดูแลคุณและเพื่อนตัวน้อยได้ดีที่สุด', `<div class="modal-pet-summary"><img src="${esc(pet.image)}" alt=""><div><b>${esc(pet.name)} · ${esc(pet.breed)}</b><small>📍 ${esc(pet.zone)}</small></div></div><form id="application-form" class="form-stack"><input type="hidden" name="petId" value="${esc(pet.id)}"><div class="form-section-title"><span>01</span><div><b>แบบประเมินความพร้อม 5 มิติ</b><small>ให้คะแนนความพร้อม 1 (ยังไม่พร้อม) ถึง 5 (พร้อมมาก)</small></div></div>${dimensions.map((item, index) => `<fieldset class="rating-field"><legend><span>${item.icon}</span><b>${item.title}</b><small>${item.description}</small></legend><div class="rating-options">${[1, 2, 3, 4, 5].map(number => `<label><input type="radio" name="dimension-${index}" value="${number}" ${number === 3 ? 'checked' : ''}><span>${number}</span></label>`).join('')}</div></fieldset>`).join('')}<label>สถานที่ที่วางแผนเลี้ยง<input name="location" placeholder="เช่น หอพัก / บ้าน พร้อมระบุพื้นที่" required maxlength="180"></label><label>เล่าให้เราฟังเพิ่มเติม <span class="optional">ไม่บังคับ</span><textarea name="note" rows="3" placeholder="สมาชิกในบ้าน ประสบการณ์ หรือข้อสงสัยที่อยากปรึกษา"></textarea></label><label class="check-line"><input type="checkbox" name="consent" required><span>ยืนยันว่าข้อมูลเป็นความจริง และยินยอมให้ทีมงานติดต่อเพื่อประเมินความพร้อม</span></label><button class="button primary full" type="submit">ส่งแบบประเมิน <span>→</span></button></form>`, 'wide-modal');
}

function openSchedule(applicationId = '', type = 'สัมภาษณ์') {
  const eligible = state.applications.filter(item => state.user.role === 'admin' || item.email === state.user.email).filter(item => state.user.role === 'admin' ? true : (item.status === 'อนุมัติ' || (type === 'ส่งมอบ' && ['ทำสัญญาแล้ว', 'รับเลี้ยงแล้ว'].includes(item.status))));
  const chosen = eligible.find(item => item.id === applicationId);
  if (!eligible.length) return toast('ยังไม่มีคำขอที่พร้อมนัดหมาย', 'error');
  modal('นัดหมายพบกัน', 'เลือกวันที่และสถานที่ที่สะดวกสำหรับทุกคน', `<form id="appointment-form" class="form-stack"><label>คำขอรับเลี้ยง<select name="applicationId" required>${eligible.map(item => `<option value="${esc(item.id)}" ${item.id === chosen?.id ? 'selected' : ''}>${esc(item.petName)} · ${esc(item.applicantName)}</option>`).join('')}</select></label><label>ประเภทนัดหมาย<select name="type"><option ${type === 'สัมภาษณ์' ? 'selected' : ''}>สัมภาษณ์</option><option ${type === 'ส่งมอบ' ? 'selected' : ''}>ส่งมอบ</option></select></label><label>วันและเวลา<input name="date" type="datetime-local" required min="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></label><label>สถานที่<input name="location" value="ศูนย์พักพิงสัตว์ มทร.ล้านนา เชียงใหม่" required maxlength="180"></label><label>หมายเหตุ<textarea name="note" rows="2" placeholder="รายละเอียดเพิ่มเติม"></textarea></label><button class="button primary full" type="submit">ยืนยันนัดหมาย <span>→</span></button></form>`);
}

function openPetForm(pet = null) {
  const isEdit = Boolean(pet);
  modal(isEdit ? 'แก้ไขข้อมูลสัตว์' : 'เพิ่มเพื่อนใหม่ในระบบ', 'ข้อมูลสุขภาพและพฤติกรรมช่วยให้พบครอบครัวที่เหมาะสม', `<form id="pet-form" class="form-stack"><input type="hidden" name="id" value="${esc(pet?.id || '')}"><div class="form-grid"><label>ชื่อสัตว์<input name="name" required value="${esc(pet?.name || '')}" maxlength="80"></label><label>ชนิด<select name="species"><option ${pet?.species === 'แมว' ? 'selected' : ''}>แมว</option><option ${pet?.species === 'สุนัข' ? 'selected' : ''}>สุนัข</option><option ${pet?.species === 'อื่น ๆ' ? 'selected' : ''}>อื่น ๆ</option></select></label><label>สายพันธุ์<input name="breed" value="${esc(pet?.breed || '')}" maxlength="80"></label><label>อายุโดยประมาณ<input name="age" value="${esc(pet?.age || '')}" placeholder="เช่น ประมาณ 1 ปี"></label><label>เพศ<input name="sex" value="${esc(pet?.sex || '')}"></label><label>โซนที่พบ<input name="zone" value="${esc(pet?.zone || '')}"></label><label>สถานะ<select name="status">${['พร้อมหาบ้าน', 'กำลังหาผู้รับเลี้ยง', 'มีผู้รับเลี้ยงแล้ว'].map(status => `<option ${pet?.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label>ลิงก์รูปภาพ<input name="image" type="url" value="${esc(pet?.image || '')}" placeholder="https://..."></label></div><label>ประวัติสุขภาพ<input name="health" value="${esc(pet?.health || '')}" maxlength="500"></label><label>พฤติกรรม<textarea name="behavior" rows="2">${esc(pet?.behavior || '')}</textarea></label><label>ประวัติวัคซีน<input name="vaccines" value="${esc(pet?.vaccines || '')}" maxlength="300"></label><button class="button primary full" type="submit">${isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูลสัตว์'} <span>→</span></button></form>`, 'wide-modal');
}

function openHealthForm() {
  modal('บันทึกประวัติสุขภาพ', 'เก็บข้อมูลให้ครบ เพื่อดูแลสุขภาพต่อเนื่อง', `<form id="health-form" class="form-stack"><label>สัตว์เลี้ยง<select name="petId" required>${state.pets.map(pet => `<option value="${esc(pet.id)}">${esc(pet.name)} · ${esc(pet.species)}</option>`).join('')}</select></label><div class="form-grid"><label>ประเภท<select name="type"><option>ตรวจสุขภาพ</option><option>วัคซีน</option><option>การรักษา</option><option>อื่น ๆ</option></select></label><label>วันที่<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label></div><label>รายละเอียด<input name="detail" required maxlength="500" placeholder="เช่น วัคซีนรวมเข็มที่ 2"></label><label>นัดครั้งถัดไป <span class="optional">ไม่บังคับ</span><input name="nextDate" type="date"></label><button class="button primary full" type="submit">บันทึกประวัติ <span>→</span></button></form>`);
}

function openFollowupForm() {
  const eligible = state.applications.filter(item => item.email === state.user.email && item.status === 'รับเลี้ยงแล้ว');
  if (!eligible.length) return toast('รายการติดตามผลจะเปิดหลังยืนยันการรับเลี้ยง', 'error');
  modal('แบ่งปันเรื่องราวของคุณ', 'ทุกการอัปเดตช่วยให้ทีมงานมั่นใจว่าเพื่อนตัวน้อยมีความสุข', `<form id="followup-form" class="form-stack"><label>เพื่อนตัวน้อย<select name="applicationId">${eligible.map(item => `<option value="${esc(item.id)}">${esc(item.petName)}</option>`).join('')}</select></label><label>อัปโหลดภาพ <span class="optional">JPG, PNG หรือ WebP · ไม่เกิน 1 MB</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><label>วันนี้เขาเป็นอย่างไรบ้าง?<textarea name="note" rows="4" maxlength="800" placeholder="เล่าเรื่องราวสั้น ๆ เช่น กินเก่งขึ้น ชอบนอนตรงไหน หรือพาไปตรวจสุขภาพ"></textarea></label><label>อารมณ์วันนี้<select name="mood"><option>ปกติดี</option><option>ร่าเริง</option><option>กำลังปรับตัว</option><option>ควรติดตามสุขภาพ</option></select></label><button class="button primary full" type="submit">ส่งอัปเดตให้ทีมงาน <span>→</span></button></form>`);
}

function openContract(applicationId) {
  const application = state.applications.find(item => item.id === applicationId);
  if (!application) return;
  const contract = state.contracts.find(item => item.applicationId === applicationId);
  const terms = ['ผู้รับเลี้ยงจะดูแลสัตว์ด้วยความเมตตา จัดหาอาหาร น้ำ และที่พักที่ปลอดภัย', 'ผู้รับเลี้ยงจะพาไปตรวจสุขภาพและฉีดวัคซีนตามคำแนะนำของสัตวแพทย์', 'จะไม่ทอดทิ้ง จำหน่าย หรือส่งต่อสัตว์โดยไม่ประสานงานกับศูนย์พักพิง', 'ยินยอมให้ทีมงานติดต่อและติดตามความเป็นอยู่หลังรับเลี้ยง'];
  modal(contract ? 'สัญญารับเลี้ยงที่ลงนามแล้ว' : 'สัญญารับเลี้ยงสัตว์ดิจิทัล', contract ? `ลงนามโดย ${esc(contract.signerName)} เมื่อ ${shortDate(contract.signedAt)}` : 'โปรดอ่านเงื่อนไขให้ครบถ้วนก่อนลงนามอิเล็กทรอนิกส์', `<div class="contract-paper"><div class="contract-seal">🐾</div><div class="contract-kicker">RMUTL · CHIANG MAI</div><h3>สัญญารับเลี้ยงสัตว์</h3><p>ทำขึ้นระหว่าง ศูนย์พักพิงสัตว์ มทร.ล้านนา เชียงใหม่ และผู้รับเลี้ยง <b>${esc(state.user.name)}</b> สำหรับสัตว์ชื่อ <b>${esc(application.petName)}</b></p><ol>${terms.map(term => `<li>${term}</li>`).join('')}</ol><div class="contract-signature"><span>ผู้รับเลี้ยง</span><b>${contract ? esc(contract.signerName) : 'ลงนามอิเล็กทรอนิกส์เมื่อยืนยัน'}</b><small>${contract ? shortDate(contract.signedAt) : `อีเมล ${esc(state.user.email)}`}</small></div><div class="contract-version">เอกสารดิจิทัล · รุ่น 1.0</div></div>${contract ? '<div class="signed-confirm">✓ ลงนามเรียบร้อยแล้ว · บันทึกสัญญาไว้ในระบบ</div>' : `<form id="contract-form" class="form-stack"><input type="hidden" name="applicationId" value="${esc(application.id)}"><label class="check-line"><input type="checkbox" name="consent" required><span>ข้าพเจ้าอ่านและยอมรับเงื่อนไขทั้งหมด พร้อมรับผิดชอบดูแลสัตว์ตลอดชีวิต</span></label><button class="button primary full" type="submit">✎ ลงนามอิเล็กทรอนิกส์ <span>→</span></button></form>`}`, 'wide-modal');
}

function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

document.addEventListener('submit', async event => {
  const form = event.target;
  event.preventDefault();
  const data = formData(form);
  const button = form.querySelector('[type="submit"]');
  if (button) { button.disabled = true; button.dataset.oldText = button.textContent; button.textContent = 'กำลังบันทึก…'; }
  try {
    if (form.id === 'register-form') {
      data.consent = form.elements.consent.checked;
      await api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
      renderLogin('login', data.email);
      toast('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
    } else if (form.id === 'login-form') {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
      await refresh();
      toast(`ยินดีต้อนรับสู่บ้านอุ่นใจ${data.name ? `, ${data.name}` : ''}`);
    } else if (form.id === 'application-form') {
      data.answers = dimensions.map((_, index) => Number(form.querySelector(`[name="dimension-${index}"]:checked`)?.value || 0));
      data.consent = form.elements.consent.checked;
      await api('/api/applications', { method: 'POST', body: JSON.stringify(data) });
      document.getElementById('modal-root').innerHTML = '';
      state.page = 'applications';
      await refresh();
      toast('ส่งแบบประเมินแล้ว ทีมงานจะติดต่อกลับเร็ว ๆ นี้');
    } else if (form.id === 'appointment-form') {
      await api('/api/appointments', { method: 'POST', body: JSON.stringify(data) });
      document.getElementById('modal-root').innerHTML = '';
      state.page = 'appointments';
      await refresh();
      toast('บันทึกนัดหมายเรียบร้อยแล้ว');
    } else if (form.id === 'pet-form') {
      const isEdit = Boolean(data.id);
      await api(isEdit ? `/api/pets/${encodeURIComponent(data.id)}` : '/api/pets', { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(data) });
      document.getElementById('modal-root').innerHTML = '';
      await refresh();
      toast(isEdit ? 'อัปเดตข้อมูลสัตว์แล้ว' : 'เพิ่มข้อมูลสัตว์แล้ว');
    } else if (form.id === 'health-form') {
      await api('/api/health-records', { method: 'POST', body: JSON.stringify(data) });
      document.getElementById('modal-root').innerHTML = '';
      await refresh();
      toast('บันทึกประวัติสุขภาพแล้ว');
    } else if (form.id === 'followup-form') {
      const file = form.elements.photo.files[0];
      if (file && file.size > 1_000_000) throw new Error('รูปมีขนาดเกิน 1 MB กรุณาเลือกรูปที่เล็กลง');
      if (file) data.photo = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('อ่านรูปภาพไม่สำเร็จ')); reader.readAsDataURL(file); });
      await api('/api/follow-ups', { method: 'POST', body: JSON.stringify(data) });
      document.getElementById('modal-root').innerHTML = '';
      state.page = 'followups';
      await refresh();
      toast('ขอบคุณที่แบ่งปันเรื่องราวน่ารัก ๆ');
    } else if (form.id === 'contract-form') {
      data.consent = form.elements.consent.checked;
      await api(`/api/contracts/${encodeURIComponent(data.applicationId)}/sign`, { method: 'POST', body: JSON.stringify(data) });
      document.getElementById('modal-root').innerHTML = '';
      await refresh();
      toast('ลงนามสัญญาดิจิทัลเรียบร้อยแล้ว');
    }
  } catch (error) {
    toast(error.message, 'error');
    if (button) { button.disabled = false; button.textContent = button.dataset.oldText || 'ลองอีกครั้ง'; }
  }
});

document.addEventListener('click', async event => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) { event.preventDefault(); state.page = pageButton.dataset.page; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'switch-auth') { renderLogin(button.dataset.mode); return; }
    if (action === 'logout') { await api('/api/auth/logout', { method: 'POST' }); Object.assign(state, { user: null, pets: [], applications: [] }); render(); }
    if (action === 'apply') openApplication(id);
    if (action === 'pet-details') { const pet = state.pets.find(item => item.id === id); toast(`${pet.name} · ${pet.health || 'สอบถามทีมงานเพื่อรับข้อมูลเพิ่มเติม'}`); }
    if (action === 'add-pet') openPetForm();
    if (action === 'edit-pet') openPetForm(state.pets.find(item => item.id === id));
    if (action === 'schedule') openSchedule(id || '', button.dataset.type || 'สัมภาษณ์');
    if (action === 'add-health') openHealthForm();
    if (action === 'add-followup') openFollowupForm();
    if (action === 'sign-contract') openContract(id);
    if (action === 'save-review') {
      const status = document.querySelector(`[data-review-status="${CSS.escape(id)}"]`).value;
      await api(`/api/applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await refresh();
      toast('อัปเดตผลการพิจารณาแล้ว');
    }
    if (action === 'close-modal' || (action === 'backdrop' && event.target === button)) document.getElementById('modal-root').innerHTML = '';
    if (action === 'profile') toast(`${state.user.email} · ${state.user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิกมหาวิทยาลัย'}`);
  } catch (error) { toast(error.message, 'error'); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'pet-search') { state.search = event.target.value; const cursor = event.target.selectionStart; renderPage(); const input = document.getElementById('pet-search'); input.focus(); input.setSelectionRange(cursor, cursor); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'pet-filter') { state.petFilter = event.target.value; renderPage(); }
});

async function initialize() {
  try { await refresh(); }
  catch (error) { renderLogin(); if (!error.message.includes('กรุณาเข้าสู่ระบบ')) console.error(error); }
}
initialize();