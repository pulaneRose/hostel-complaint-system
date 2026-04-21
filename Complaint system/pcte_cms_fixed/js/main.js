
console.log("JS LOADED");
const STORE_KEY = 'pp_cms_complaints_v1';
const ROLE_KEY = 'pp_cms_role';
const ID_PREFIX = 'PP-CMP-';
function loadData(){ try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
function saveData(data){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function genId(){ const n = Math.floor(Math.random()*1e6).toString().padStart(6,'0'); return ID_PREFIX + n; }
function nowISO(){ return new Date().toISOString(); }
function setRole(role){ localStorage.setItem(ROLE_KEY, role); const sel=document.getElementById('roleSelect'); if (sel) sel.value = role; }
function getRole(){ return localStorage.getItem(ROLE_KEY) || 'student'; }


const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.style.display === 'flex';
    siteNav.style.display = open ? 'none' : 'flex';
    navToggle.setAttribute('aria-expanded', String(!open));
  });
}
(function activateNav(){
  const map = {'index.html':'home','submit.html':'submit','my-complaints.html':'mine','manage.html':'manage','faq.html':'faq','about.html':'about','contact.html':'contact'};
  const path = (location.pathname.split('/').pop() || 'index.html');
  const key = map[path] || 'home';
  document.querySelectorAll(`[data-nav="${key}"]`).forEach(a => a.classList.add('active'));
})();


const roleSelect = document.getElementById('roleSelect');
if (roleSelect){ roleSelect.value = getRole(); roleSelect.addEventListener('change', e => setRole(e.target.value)); }


(function dashboard(){
  const totalEl = document.getElementById('statTotal'); if (!totalEl) return;
  const openEl = document.getElementById('statOpen'); const resolvedEl = document.getElementById('statResolved');
  const recentList = document.getElementById('recentList'); const byHostel = document.getElementById('byHostel');
  const data = loadData(); const openStatuses = ['Submitted','In Review','In Progress'];
  const total = data.length; const open = data.filter(d => openStatuses.includes(d.status)).length; const resolved = data.filter(d => d.status === 'Resolved').length;
  totalEl.textContent = total; openEl.textContent = open; resolvedEl.textContent = resolved;
  const hostels = ['Girls Hostel','Boys Hostel','Guest Hostel'];
  byHostel.innerHTML = hostels.map(h => {
    const all = data.filter(d => d.hostel === h);
    const o = all.filter(d => openStatuses.includes(d.status)).length;
    const r = all.filter(d => d.status === 'Resolved').length;
    return `<article class="card"><div class="card-body"><h3>${h}</h3>
      <p class="card-row"><span>Total: <strong>${all.length}</strong></span><span class="badge Submitted">${o} open</span></p>
      <p class="card-row"><span>Resolved: <strong>${r}</strong></span><a class="btn btn-sm" href="manage.html?hostel=${encodeURIComponent(h)}">View</a></p>
    </div></article>`; }).join('');
  const recent = [...data].sort((a,b)=> b.created.localeCompare(a.created)).slice(0,3);
  recentList.innerHTML = recent.map(c => `<article class="card"><div class="card-body">
    <h3>${c.title}</h3><p>${c.description.length>100? c.description.slice(0,100)+'…': c.description}</p>
    <div class="card-row"><span class="badge ${c.status}">${c.status}</span><a class="btn btn-sm" href="manage.html?id=${encodeURIComponent(c.id)}">Details</a></div>
  </div></article>`).join('');
})();


(function submitPage(){
  const form = document.getElementById('submitForm'); if (!form) return;
  const statusEl = document.getElementById('submitStatus'); const imgInput = document.getElementById('image');
  async function toBase64(file){ return await new Promise((res, rej) => { const r = new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
  function showError(name, msg){ const err=document.querySelector(`[data-error-for="${name}"]`); if (err) err.textContent = msg||''; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); let ok = true; const data = new FormData(form);
    const studentId = (data.get('studentId')||'').trim(); const hostel=(data.get('hostel')||'').trim();
    const room=(data.get('room')||'').trim(); const category=(data.get('category')||'').trim();
    const urgency=(data.get('urgency')||'').trim(); const email=(data.get('email')||'').trim();
    const title=(data.get('title')||'').trim(); const description=(data.get('description')||'').trim();
    const anonymous = data.get('anonymous') === 'on';
    ['studentId','hostel','room','category','title','description','email'].forEach(n=>showError(n,''));
    if (!studentId){ showError('studentId','Enter your student ID'); ok=false; }
    if (!hostel){ showError('hostel','Select a hostel'); ok=false; }
    if (!room){ showError('room','Enter room number'); ok=false; }
    if (!category){ showError('category','Select category'); ok=false; }
    if (!title){ showError('title','Enter a short title'); ok=false; }
    if (!description){ showError('description','Please describe the issue'); ok=false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showError('email','Enter a valid email'); ok=false; }
    if (!ok) return;
    let image64 = ''; if (imgInput && imgInput.files && imgInput.files[0]){ try { image64 = await toBase64(imgInput.files[0]); } catch {} }
    const all = loadData(); const id = genId();
    const item = { id, studentId, hostel, room, category, urgency, email, title, description, anonymous, image64, status:'Submitted', created: nowISO(), updated: nowISO(), notes:'' };
    all.push(item); saveData(all); localStorage.setItem('pp_last_student', studentId);
    statusEl.textContent = 'Submitted! Your complaint ID is ' + id; form.reset();
  });
})();


(function minePage(){
  const list = document.getElementById('mineList'); if (!list) return;
  const search = document.getElementById('filterSearch'); const status = document.getElementById('filterStatus');
  function render(){
    const data = loadData(); const myIdPrompt = localStorage.getItem('pp_last_student') || prompt('Enter your Student ID to view your submissions:');
    if (!myIdPrompt){ list.innerHTML = '<p>Please reload and enter Student ID to view your complaints.</p>'; return; }
    localStorage.setItem('pp_last_student', myIdPrompt);
    let rows = data.filter(d => (d.studentId||'').toLowerCase() === myIdPrompt.toLowerCase());
    const q = (search.value||'').toLowerCase(); const st = status.value;
    if (q) rows = rows.filter(r => (r.title+r.room+r.category).toLowerCase().includes(q));
    if (st) rows = rows.filter(r => r.status === st);
    if (!rows.length){ list.innerHTML = '<p>No complaints found.</p>'; return; }
    list.innerHTML = rows.sort((a,b)=>b.created.localeCompare(a.created)).map(r => `
      <article class="card row">
        <div class="row-main">
          <h3 class="row-title">${r.title}</h3>
          <div class="row-meta">
            <span class="badge ${r.status}">${r.status}</span>
            <span class="tag">${r.hostel}</span>
            <span class="tag">${r.category}</span>
            <span class="tag">Room ${r.room}</span>
            <span class="tag">#${r.id}</span>
          </div>
          <p class="row-desc">${r.description}</p>
          ${r.notes ? `<p><strong>Warden notes:</strong> ${r.notes}</p>` : ''}
        </div>
        <div class="row-actions">
          <small>Created: ${new Date(r.created).toLocaleString()}</small>
          <small>Updated: ${new Date(r.updated).toLocaleString()}</small>
        </div>
      </article>`).join('');
  }
  search.addEventListener('input', render); status.addEventListener('change', render); render();
})();


(function managePage(){
  const list = document.getElementById('manageList'); if (!list) return;
  const role = getRole(); if (!['warden','admin'].includes(role)){
    list.innerHTML = '<p>You are in Student mode. Use the role switch on the Dashboard to switch to Warden/Admin for demo purposes.</p>';
  }
  const selHostel = document.getElementById('manageHostel'); const selStatus = document.getElementById('manageStatus'); const search = document.getElementById('manageSearch');
  function render(){
    const data = loadData(); let rows = data;
    const url = new URL(location.href); const idParam = url.searchParams.get('id'); const hostelParam = url.searchParams.get('hostel');
    if (idParam) rows = rows.filter(r => r.id === idParam); if (hostelParam) rows = rows.filter(r => r.hostel === hostelParam);
    const h = selHostel.value; const s = selStatus.value; const q = (search.value||'').toLowerCase();
    if (h) rows = rows.filter(r => r.hostel === h); if (s) rows = rows.filter(r => r.status === s); if (q) rows = rows.filter(r => (r.title + r.room + r.id).toLowerCase().includes(q));
    if (!rows.length){ list.innerHTML = '<p>No complaints match the current filters.</p>'; return; }
    list.innerHTML = '';
    rows.sort((a,b)=> b.created.localeCompare(a.created)).forEach(r => {
      const card = document.createElement('article'); card.className = 'card row';
      const left = document.createElement('div'); left.className = 'row-main';
      left.innerHTML = `<h3 class="row-title">${r.title}</h3>
        <div class="row-meta">
          <span class="badge ${r.status}">${r.status}</span>
          <span class="tag">${r.hostel}</span>
          <span class="tag">${r.category}</span>
          <span class="tag">Room ${r.room}</span>
          <span class="tag">#${r.id}</span>
          ${r.anonymous ? '<span class="tag">Anonymous</span>' : ''}
        </div>
        <p class="row-desc">${r.description}</p>
        ${r.image64 ? `<img src="${r.image64}" alt="Attachment" style="max-width:220px;border-radius:12px;border:1px solid #1b2750">` : ''}
        <p style="opacity:.8;margin-top:8px"><small>Student ID: ${r.anonymous ? '(hidden)' : r.studentId}</small></p>`;
      const right = document.createElement('div'); right.className = 'row-actions';
      const sel = document.createElement('select'); sel.className = 'row-status';
      ['Submitted','In Review','In Progress','Resolved','Rejected'].forEach(s=>{ const o=document.createElement('option'); o.textContent=s; o.selected=(s===r.status); sel.appendChild(o); });
      const notes = document.createElement('textarea'); notes.className='row-notes'; notes.rows=3; notes.placeholder='Add warden notes'; notes.value = r.notes || '';
      const save = document.createElement('button'); save.className='btn btn-sm btn-primary row-save'; save.textContent='Save';
      save.addEventListener('click', () => {
        const all = loadData(); const idx = all.findIndex(x => x.id === r.id);
        if (idx >= 0){ all[idx].status = sel.value; all[idx].notes = notes.value.trim(); all[idx].updated = nowISO(); saveData(all); render(); }
      });
      right.appendChild(sel); right.appendChild(notes); right.appendChild(save);
      card.appendChild(left); card.appendChild(right); list.appendChild(card);
    });
  }
  selHostel.addEventListener('change', render); selStatus.addEventListener('change', render); search.addEventListener('input', render); render();
})();

(function contact(){
  const form = document.getElementById('contactForm'); if (!form) return;
  const statusEl = document.getElementById('formStatus');
  function showError(name, msg){ const err = document.querySelector(`[data-error-for="${name}"]`); if (err) err.textContent = msg || ''; }
  form.addEventListener('submit', (e)=>{
    e.preventDefault(); showError('name',''); showError('email2','');
    const name = form.name.value.trim(); const email = form.email2.value.trim();
    if (!name){ showError('name','Enter your name'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showError('email2','Enter a valid email'); return; }
    statusEl.textContent = 'Thanks! Your message has been sent.'; form.reset();
  });
})();


const AUTH_ROLE_KEY = 'pp_auth_role';
const AUTH_ID_KEY = 'pp_auth_id';
function setAuth(role, id){ localStorage.setItem(AUTH_ROLE_KEY, role); localStorage.setItem(AUTH_ID_KEY, id); }
function clearAuth(){ localStorage.removeItem(AUTH_ROLE_KEY); localStorage.removeItem(AUTH_ID_KEY); }
function getAuth(){ return { role: localStorage.getItem(AUTH_ROLE_KEY)||'', id: localStorage.getItem(AUTH_ID_KEY)||'' }; }
function isStudent(){ const a=getAuth(); return a.role==='student' && /^PP/i.test(a.id); }
function isStaff(){ const a=getAuth(); return a.role==='warden' || a.role==='admin'; }
function requireAuth(need){
  const a = getAuth();
  if (need==='student'){ if (!isStudent()) { const red = encodeURIComponent(location.pathname.split('/').pop()); location.href = `login.html?role=student&redirect=${red}`; return false; } }
  if (need==='staff'){ if (!isStaff()) { const red = encodeURIComponent(location.pathname.split('/').pop()); location.href = `login.html?role=warden&redirect=${red}`; return false; } }
  return true;
}


document.addEventListener('click', (e)=>{
  const a = e.target.closest('a[href]');
  if (!a) return;
  const need = a.getAttribute('data-requires');
  if (!need) return;
  if (need==='student' && !isStudent()){ e.preventDefault(); const red = encodeURIComponent(a.getAttribute('href')); location.href = `login.html?role=student&redirect=${red}`; }
  if (need==='staff' && !isStaff()){ e.preventDefault(); const red = encodeURIComponent(a.getAttribute('href')); location.href = `login.html?role=warden&redirect=${red}`; }
});


(function guardRoutes(){
  const file = (location.pathname.split('/').pop() || 'index.html');
  if (file === 'submit.html' || file === 'my-complaints.html'){ requireAuth('student'); }
  if (file === 'manage.html'){ requireAuth('staff'); }
})();


(function loginPage(){
  if (!location.pathname.includes('login.html')) return;
  console.log("LOGIN SCRIPT RUNNING");
  const form = document.getElementById('loginForm'); if (!form) return;
  const statusEl = document.getElementById('loginStatus');
  const roleEl = document.getElementById('loginRole'); const idEl = document.getElementById('loginId');

  
  const url = new URL(location.href);
  const roleHint = url.searchParams.get('role');
  const redirectTo = url.searchParams.get('redirect') || 'index.html';
  if (roleHint) roleEl.value = roleHint;

  function showError(name, msg){
    const err = document.querySelector(`[data-error-for="${name}"]`);
    if (err) err.textContent = msg || '';
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    showError('loginRole',''); showError('loginId',''); statusEl.textContent = '';
    const role = roleEl.value; const id = idEl.value.trim();
    if (!role){ showError('loginRole','Select a role'); return; }
    if (!id){ showError('loginId','Enter your ID'); return; }

   
    let ok = false;
    if (role === 'student'){ ok = /^PP[\w-]+/i.test(id); }
    if (role === 'warden'){ ok = /^(GIRLS|BOYS|GUEST)-WARDEN$/i.test(id); }
    if (role === 'admin'){ ok = /^ADMIN-PP$/i.test(id); }
    if (!ok){ showError('loginId','Invalid ID for selected role'); return; }

    setAuth(role.toLowerCase(), id.toUpperCase());
    if (role === 'student'){ localStorage.setItem('pp_last_student', id.toUpperCase()); }

    statusEl.textContent = 'Login successful. Redirecting…';
   location.href = redirectTo;
  });
})();


(function bindStudentToSubmit(){
  const file = (location.pathname.split('/').pop() || 'index.html');
  if (file !== 'submit.html') return;
  const a = getAuth(); const input = document.getElementById('studentId');
  if (isStudent() && input){
    input.value = a.id; input.readOnly = true; input.setAttribute('title','Your ID is taken from login');
  }
})();


(function bindStudentToMine(){
  const file = (location.pathname.split('/').pop() || 'index.html');
  if (file !== 'my-complaints.html') return;
  const a = getAuth();
  if (isStudent()){ localStorage.setItem('pp_last_student', a.id); }
})();




(function hostelCarousel(){
  const root = document.getElementById('hostelCarousel');
  if (!root) return;

  const track = root.querySelector('.carousel-track');
  const slides = Array.from(root.querySelectorAll('.carousel-slide'));
  const prevBtn = root.querySelector('.prev');
  const nextBtn = root.querySelector('.next');
  const dotsWrap = root.querySelector('.carousel-dots');

  let index = 0;
  const last = slides.length - 1;
  const go = (i) => {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    updateDots();
  };

 
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', `Slide ${i+1}`);
    d.addEventListener('click', () => go(i));
    dotsWrap.appendChild(d);
  });
  const updateDots = () => {
    const dots = dotsWrap.querySelectorAll('button');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  };
  updateDots();

 
  prevBtn.addEventListener('click', () => go(index - 1));
  nextBtn.addEventListener('click', () => go(index + 1));

 
  let timer = setInterval(() => go(index + 1), 4000);
  const pause = () => clearInterval(timer);
  const resume = () => (timer = setInterval(() => go(index + 1), 4000));

  root.addEventListener('mouseenter', pause);
  root.addEventListener('mouseleave', resume);


  let startX = 0, dx = 0, swiping = false;
  root.addEventListener('touchstart', (e) => {
    swiping = true;
    startX = e.touches[0].clientX;
    pause();
  }, {passive:true});
  root.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    dx = e.touches[0].clientX - startX;
  }, {passive:true});
  root.addEventListener('touchend', () => {
    if (!swiping) return;
    if (dx > 40) go(index - 1);
    else if (dx < -40) go(index + 1);
    swiping = false; dx = 0; resume();
  });
})();



(function navAuthIndicator() {
  const role = localStorage.getItem('pp_auth_role');
  const id   = localStorage.getItem('pp_auth_id');
  const link = document.getElementById('navLoginLink');
  if (!link) return;
  if (role && id) {
    
    link.textContent = id.slice(0, 14) + (id.length > 14 ? '…' : '') + ' ▾';
    link.title = 'Logged in as ' + id + ' (' + role + '). Click to manage session.';
  } else {
    link.textContent = 'Login';
    link.title = '';
  }
})();
