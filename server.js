const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'shelter.json');
const DEMO_LOGIN_CODE = process.env.DEMO_LOGIN_CODE || '123456';
const sessions = new Map();
const loginAttempts = new Map();
const statuses = ['รอตรวจสอบ', 'นัดสัมภาษณ์', 'อนุมัติ', 'ไม่ผ่าน', 'ทำสัญญาแล้ว', 'รับเลี้ยงแล้ว'];

function makeSeed() {
  return {
    pets: [
      { id: 'PET-001', name: 'เฉาก๊วย', species: 'แมว', breed: 'วิเชียรมาศผสม', age: 'ประมาณ 1 ปี', sex: 'ผู้', zone: 'อาคารเรียนรวม', status: 'พร้อมหาบ้าน', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900', health: 'สุขภาพแข็งแรง ตรวจสุขภาพเบื้องต้นแล้ว', behavior: 'ขี้อ้อน เป็นมิตรกับคน', vaccines: 'วัคซีนรวมเข็มแรก', createdAt: new Date().toISOString() },
      { id: 'PET-002', name: 'ลักกี้', species: 'สุนัข', breed: 'ไทยหลังอานผสม', age: 'ประมาณ 2 ปี', sex: 'เมีย', zone: 'โรงอาหารกลาง', status: 'พร้อมหาบ้าน', image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=900', health: 'อยู่ระหว่างวางแผนวัคซีน', behavior: 'กระตือรือร้น เข้ากับคนได้ดี', vaccines: 'รอตรวจประวัติเดิม', createdAt: new Date().toISOString() },
      { id: 'PET-003', name: 'ข้าวปั้น', species: 'แมว', breed: 'แมวไทย', age: 'ประมาณ 8 เดือน', sex: 'เมีย', zone: 'หอสมุดกลาง', status: 'พร้อมหาบ้าน', image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900', health: 'ตรวจสุขภาพแล้ว ไม่มีอาการผิดปกติ', behavior: 'สุภาพ ชอบอยู่ในที่สงบ', vaccines: 'วัคซีนรวมครบตามวัย', createdAt: new Date().toISOString() },
      { id: 'PET-004', name: 'ถุงทอง', species: 'สุนัข', breed: 'สุนัขไทยผสม', age: 'ประมาณ 1 ปี', sex: 'ผู้', zone: 'อาคารกิจกรรมนักศึกษา', status: 'กำลังหาผู้รับเลี้ยง', image: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=900', health: 'สุขภาพทั่วไปแข็งแรง', behavior: 'เป็นมิตร ชอบเดินเล่น', vaccines: 'รอนัดวัคซีนประจำปี', createdAt: new Date().toISOString() }
    ],
    applications: [], appointments: [], contracts: [], healthRecords: [], followUps: [], users: []
  };
}

function loadStore() {
  try {
    const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const seed = makeSeed();
    return { ...seed, ...store };
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('อ่านข้อมูลไม่สำเร็จ ใช้ข้อมูลเริ่มต้น:', error.message);
    return makeSeed();
  }
}

let store = loadStore();

function saveStore() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '7mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getCookie(req, key) {
  const cookies = (req.headers.cookie || '').split(';');
  const entry = cookies.map(item => item.trim()).find(item => item.startsWith(`${key}=`));
  return entry ? decodeURIComponent(entry.slice(key.length + 1)) : '';
}

function requireAuth(req, res, next) {
  const user = sessions.get(getCookie(req, 'shelter_session'));
  if (!user) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
  next();
}

function text(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function publicUser(user) {
  return { email: user.email, name: user.name, role: user.role };
}

function canAccessApplication(application, user) {
  return user.role === 'admin' || application.email === user.email;
}

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip;
  const attempts = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (attempts.until > Date.now()) return res.status(429).json({ error: 'ลองเข้าสู่ระบบถี่เกินไป โปรดลองอีกครั้งภายหลัง' });

  const email = text(req.body.email, 160).toLowerCase();
  const name = text(req.body.name, 80);
  const code = text(req.body.code, 20);
  if (!/^[^\s@]+@rmutl\.ac\.th$/.test(email)) return res.status(400).json({ error: 'กรุณาใช้อีเมลมหาวิทยาลัย @rmutl.ac.th' });
  if (code !== DEMO_LOGIN_CODE) {
    attempts.count += 1;
    if (attempts.count >= 5) { attempts.count = 0; attempts.until = Date.now() + 60_000; }
    loginAttempts.set(ip, attempts);
    return res.status(401).json({ error: 'รหัสยืนยันไม่ถูกต้อง' });
  }

  loginAttempts.delete(ip);
  let user = store.users.find(item => item.email === email);
  if (!user) {
    user = { email, name: name || email.split('@')[0], role: email === 'admin@rmutl.ac.th' ? 'admin' : 'user' };
    store.users.push(user);
    saveStore();
  } else if (name && user.name !== name) {
    user.name = name;
    saveStore();
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, user);
  res.setHeader('Set-Cookie', `shelter_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  sessions.delete(getCookie(req, 'shelter_session'));
  res.setHeader('Set-Cookie', 'shelter_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/bootstrap', requireAuth, (req, res) => {
  const applications = store.applications.filter(application => canAccessApplication(application, req.user));
  const ids = new Set(applications.map(application => application.id));
  res.json({
    user: publicUser(req.user), pets: store.pets,
    applications,
    appointments: store.appointments.filter(item => req.user.role === 'admin' || item.email === req.user.email),
    contracts: store.contracts.filter(item => req.user.role === 'admin' || item.email === req.user.email),
    healthRecords: store.healthRecords,
    followUps: store.followUps.filter(item => req.user.role === 'admin' || item.email === req.user.email),
    applicationIds: [...ids]
  });
});

app.post('/api/pets', requireAuth, requireAdmin, (req, res) => {
  const name = text(req.body.name, 80);
  if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อสัตว์' });
  const pet = {
    id: `PET-${String(Date.now()).slice(-6)}`, name, species: text(req.body.species, 30) || 'ไม่ระบุ',
    breed: text(req.body.breed, 80) || 'ไม่ระบุสายพันธุ์', age: text(req.body.age, 40) || 'ไม่ทราบอายุ',
    sex: text(req.body.sex, 20) || 'ไม่ระบุ', zone: text(req.body.zone, 100), status: 'พร้อมหาบ้าน',
    image: text(req.body.image, 1_000) || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900',
    health: text(req.body.health, 500), behavior: text(req.body.behavior, 500), vaccines: text(req.body.vaccines, 300), createdAt: new Date().toISOString()
  };
  store.pets.unshift(pet);
  saveStore();
  res.status(201).json(pet);
});

app.patch('/api/pets/:id', requireAuth, requireAdmin, (req, res) => {
  const pet = store.pets.find(item => item.id === req.params.id);
  if (!pet) return res.status(404).json({ error: 'ไม่พบข้อมูลสัตว์' });
  for (const key of ['name', 'species', 'breed', 'age', 'sex', 'zone', 'status', 'image', 'health', 'behavior', 'vaccines']) {
    if (req.body[key] !== undefined) pet[key] = text(req.body[key], key === 'image' ? 1_000 : 500);
  }
  saveStore();
  res.json(pet);
});

app.post('/api/applications', requireAuth, (req, res) => {
  const pet = store.pets.find(item => item.id === req.body.petId);
  const answers = req.body.answers;
  if (!pet || pet.status !== 'พร้อมหาบ้าน') return res.status(400).json({ error: 'สัตว์ตัวนี้ไม่เปิดรับคำขอในขณะนี้' });
  if (!Array.isArray(answers) || answers.length !== 5 || answers.some(answer => ![1, 2, 3, 4, 5].includes(Number(answer)))) return res.status(400).json({ error: 'กรุณาตอบแบบประเมินความพร้อมทั้ง 5 มิติ' });
  if (!req.body.consent || !text(req.body.location, 180)) return res.status(400).json({ error: 'กรุณาระบุสถานที่เลี้ยงและยืนยันความยินยอม' });
  const application = {
    id: `APP-${Date.now().toString(36).toUpperCase()}`, petId: pet.id, petName: pet.name,
    email: req.user.email, applicantName: req.user.name, status: 'รอตรวจสอบ', answers: answers.map(Number),
    score: Math.round(answers.reduce((sum, value) => sum + Number(value), 0) / 25 * 100),
    location: text(req.body.location, 180), note: text(req.body.note, 1000), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  store.applications.unshift(application);
  saveStore();
  res.status(201).json(application);
});

app.patch('/api/applications/:id', requireAuth, requireAdmin, (req, res) => {
  const application = store.applications.find(item => item.id === req.params.id);
  if (!application) return res.status(404).json({ error: 'ไม่พบคำขอรับเลี้ยง' });
  const status = text(req.body.status, 40);
  if (!statuses.includes(status)) return res.status(400).json({ error: 'สถานะคำขอไม่ถูกต้อง' });
  application.status = status;
  application.reviewNote = text(req.body.reviewNote, 500);
  application.updatedAt = new Date().toISOString();
  if (status === 'รับเลี้ยงแล้ว') {
    const pet = store.pets.find(item => item.id === application.petId);
    if (pet) pet.status = 'มีผู้รับเลี้ยงแล้ว';
  }
  saveStore();
  res.json(application);
});

app.post('/api/appointments', requireAuth, (req, res) => {
  const application = store.applications.find(item => item.id === req.body.applicationId && canAccessApplication(item, req.user));
  if (!application) return res.status(404).json({ error: 'ไม่พบคำขอรับเลี้ยงที่เกี่ยวข้อง' });
  const isHandover = text(req.body.type, 30) === 'ส่งมอบ';
  const allowedStatuses = isHandover ? ['อนุมัติ', 'ทำสัญญาแล้ว'] : ['อนุมัติ'];
  if (req.user.role !== 'admin' && !allowedStatuses.includes(application.status)) return res.status(403).json({ error: isHandover ? 'กรุณาลงนามสัญญาก่อนนัดรับมอบ' : 'รอการอนุมัติคำขอก่อนนัดหมาย' });
  const date = text(req.body.date, 40);
  if (!date || Number.isNaN(Date.parse(date))) return res.status(400).json({ error: 'กรุณาเลือกวันและเวลาที่ถูกต้อง' });
  const appointment = { id: `APT-${Date.now().toString(36).toUpperCase()}`, applicationId: application.id, petName: application.petName, email: application.email, date, location: text(req.body.location, 180) || 'ศูนย์พักพิงสัตว์ มทร.ล้านนา เชียงใหม่', type: text(req.body.type, 30) || 'สัมภาษณ์', note: text(req.body.note, 300), createdAt: new Date().toISOString() };
  store.appointments.unshift(appointment);
  if (appointment.type === 'สัมภาษณ์') application.status = 'นัดสัมภาษณ์';
  saveStore();
  res.status(201).json(appointment);
});

app.post('/api/contracts/:applicationId/sign', requireAuth, (req, res) => {
  const application = store.applications.find(item => item.id === req.params.applicationId && canAccessApplication(item, req.user));
  if (!application) return res.status(404).json({ error: 'ไม่พบคำขอรับเลี้ยง' });
  if (application.status !== 'อนุมัติ' && application.status !== 'ทำสัญญาแล้ว') return res.status(400).json({ error: 'สัญญาจะพร้อมเมื่อคำขอได้รับอนุมัติแล้ว' });
  if (!req.body.consent) return res.status(400).json({ error: 'กรุณายืนยันการยอมรับเงื่อนไขสัญญา' });
  let contract = store.contracts.find(item => item.applicationId === application.id);
  if (!contract) {
    contract = { id: `CON-${Date.now().toString(36).toUpperCase()}`, applicationId: application.id, petName: application.petName, email: application.email, signedAt: new Date().toISOString(), signerName: req.user.name, termsVersion: '1.0' };
    store.contracts.unshift(contract);
  }
  application.status = 'ทำสัญญาแล้ว';
  application.updatedAt = new Date().toISOString();
  saveStore();
  res.json(contract);
});

app.post('/api/health-records', requireAuth, requireAdmin, (req, res) => {
  const pet = store.pets.find(item => item.id === req.body.petId);
  if (!pet) return res.status(404).json({ error: 'ไม่พบข้อมูลสัตว์' });
  const record = { id: `HLT-${Date.now().toString(36).toUpperCase()}`, petId: pet.id, petName: pet.name, date: text(req.body.date, 40) || new Date().toISOString().slice(0, 10), type: text(req.body.type, 40) || 'ตรวจสุขภาพ', detail: text(req.body.detail, 500), nextDate: text(req.body.nextDate, 40), createdBy: req.user.email };
  if (!record.detail) return res.status(400).json({ error: 'กรุณาระบุรายละเอียดการรักษาหรือวัคซีน' });
  store.healthRecords.unshift(record);
  pet.health = record.detail;
  if (record.type === 'วัคซีน') pet.vaccines = record.detail;
  saveStore();
  res.status(201).json(record);
});

app.post('/api/follow-ups', requireAuth, (req, res) => {
  const application = store.applications.find(item => item.id === req.body.applicationId && item.email === req.user.email);
  if (!application || application.status !== 'รับเลี้ยงแล้ว') return res.status(400).json({ error: 'รายการติดตามผลใช้ได้หลังรับเลี้ยงสัตว์แล้วเท่านั้น' });
  const photo = text(req.body.photo, 6_000_000);
  if (photo && !/^data:image\/(jpeg|png|webp);base64,/.test(photo)) return res.status(400).json({ error: 'รูปภาพต้องเป็น JPEG, PNG หรือ WebP' });
  const update = { id: `UPD-${Date.now().toString(36).toUpperCase()}`, applicationId: application.id, petId: application.petId, petName: application.petName, email: req.user.email, note: text(req.body.note, 800), photo, mood: text(req.body.mood, 30) || 'ปกติดี', createdAt: new Date().toISOString() };
  if (!update.note && !photo) return res.status(400).json({ error: 'กรุณาเพิ่มบันทึกหรือรูปภาพอย่างน้อยหนึ่งรายการ' });
  store.followUps.unshift(update);
  saveStore();
  res.status(201).json({ ...update, photo: Boolean(update.photo) });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ API ที่ร้องขอ' }));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((error, req, res, next) => {
  console.error(error);
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'ข้อมูล JSON ไม่ถูกต้อง' });
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
});

app.listen(PORT, () => console.log(`🐾 RMUTL Pet Shelter พร้อมใช้งานที่ http://localhost:${PORT}`));