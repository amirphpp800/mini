// Basic fetch helper with JSON
async function fetchJSON(url, opts={}){
  const res = await fetch(url, { headers:{ 'Content-Type':'application/json' }, ...opts });
  if(!res.ok){
    let msg;
    try { msg = await res.json(); } catch { msg = await res.text(); }
    const err = new Error(typeof msg === 'string' ? msg : (msg?.error || 'error'));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Local auth state
function getUser(){ try { return localStorage.getItem('userId'); } catch { return null; } }
function setUser(id){ try { localStorage.setItem('userId', id); } catch {} }
function clearUser(){ try { localStorage.removeItem('userId'); } catch {} }

// UI elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userIdSpan = document.getElementById('user-id');
const guestActions = document.getElementById('guest-actions');
const userActions = document.getElementById('user-actions');
const openAuthBtn = document.getElementById('open-auth-btn');
const accountBtn = document.getElementById('account-btn');
const accountInfo = document.getElementById('account-info');
const ownedIps = document.getElementById('owned-ips');
const kvStatus = document.getElementById('kv-status');

// Auth step elements
const registerStep = document.getElementById('register-step');
const verifyStep = document.getElementById('verify-step');
const telegramIdInput = document.getElementById('telegram-id');
const sendCodeBtn = document.getElementById('send-code-btn');
const registerMessage = document.getElementById('register-message');
const verifyTelegramIdInput = document.getElementById('verify-telegram-id');
const verifyCodeInput = document.getElementById('verify-code');
const verifyBtn = document.getElementById('verify-btn');
const verifyMessage = document.getElementById('verify-message');

const logoutBtn = document.getElementById('logout-btn');

function showApp(userId){
  if(userId){
    userIdSpan.textContent = userId;
    guestActions?.classList.add('hidden');
    userActions?.classList.remove('hidden');
  } else {
    guestActions?.classList.remove('hidden');
    userActions?.classList.add('hidden');
  }
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  loadCounts();
  loadCountries();
}

function showAuth(){
  appSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  registerStep.classList.remove('hidden');
  verifyStep.classList.add('hidden');
}

// Send code
sendCodeBtn?.addEventListener('click', async ()=>{
  const telegramId = (telegramIdInput?.value || '').trim();
  registerMessage.className = '';
  registerMessage.textContent = '';
  if(!telegramId){
    registerMessage.className = 'error';
    registerMessage.textContent = 'آیدی تلگرام را وارد کنید';
    return;
  }
  try {
    await fetchJSON('/api/register', { method:'POST', body: JSON.stringify({ telegramId })});
    // Move to verify step and fill id
    verifyTelegramIdInput.value = telegramId;
    registerMessage.className = 'success';
    registerMessage.textContent = 'کد تایید ارسال شد';
    registerStep.classList.add('hidden');
    verifyStep.classList.remove('hidden');
    verifyCodeInput.focus();
  } catch(e){
    registerMessage.className = 'error';
    registerMessage.textContent = 'خطا در ارسال کد';
  }
});

// Verify code
verifyBtn?.addEventListener('click', async ()=>{
  const telegramId = verifyTelegramIdInput?.value;
  const code = (verifyCodeInput?.value || '').trim();
  verifyMessage.className = '';
  verifyMessage.textContent = '';
  if(!code){
    verifyMessage.className = 'error';
    verifyMessage.textContent = 'کد تایید را وارد کنید';
    return;
  }
  try {
    const resp = await fetchJSON('/api/verify', { method:'POST', body: JSON.stringify({ telegramId, code })});
    // Server sets a long-lived cookie; also persist localStorage for instant gating
    setUser(resp.userId || telegramId);
    showApp(resp.userId || telegramId);
  } catch(e){
    verifyMessage.className = 'error';
    verifyMessage.textContent = 'کد نامعتبر است یا منقضی شده';
  }
});

// Logout clears local and cookie
logoutBtn?.addEventListener('click', ()=>{
  clearUser();
  // clear cookie
  document.cookie = 'user=; Path=/; Max-Age=0; SameSite=Lax';
  showAuth();
});

// Open auth UI from header button
openAuthBtn?.addEventListener('click', ()=>{
  authSection.classList.remove('hidden');
});

// Load account info (requires login)
async function loadAccount(){
  const uid = getUser();
  if(!uid){
    accountInfo.textContent = 'برای مشاهده اطلاعات، وارد شوید.';
    ownedIps.innerHTML = '';
    return;
  }
  try {
    const me = await fetchJSON('/api/me');
    accountInfo.textContent = `کاربر: ${me.userId}`;
    ownedIps.innerHTML = '';
    if(me.owned && me.owned.length){
      me.owned.forEach(o => {
        const row = document.createElement('div');
        row.className = 'address-item';
        row.innerHTML = `<div>${o.ip}</div><div class="badge">${o.country}</div>`;
        ownedIps.appendChild(row);
      });
    } else {
      const none = document.createElement('div');
      none.className = 'badge';
      none.textContent = 'هیچ IP فعالی ندارید.';
      ownedIps.appendChild(none);
    }
  } catch(e){
    accountInfo.textContent = 'خطا در دریافت اطلاعات حساب';
  }
}

accountBtn?.addEventListener('click', loadAccount);

// Data loading
async function loadCounts(){
  try {
    const data = await fetchJSON('/api/counts');
    document.getElementById('stat-total').textContent = data.totalIPs;
    document.getElementById('stat-free').textContent = data.freeIPs;
    document.getElementById('stat-used').textContent = data.usedIPs;
  } catch(e){
    // countries are public; ignore auth errors
  }
}

async function loadCountries(){
  try {
    const data = await fetchJSON('/api/countries');
    const el = document.getElementById('countries');
    el.innerHTML = '';
    data.countries.forEach(c => {
      const card = document.createElement('div');
      card.className = 'country-card-modern';

      const header = document.createElement('div');
      header.className = 'country-header';

      const flag = document.createElement('img');
      flag.className = 'country-flag-modern';
      flag.src = `https://flagcdn.com/${c.code.toLowerCase()}.svg`;
      flag.alt = c.name;
      flag.loading = 'lazy';
      flag.decoding = 'async';

      const info = document.createElement('div');
      info.className = 'country-info';
      info.innerHTML = `<h3>${c.name}</h3><span class="country-code">${c.code}</span>`;

      header.append(flag, info);

      // small glass stats inside each card
      const stats = document.createElement('div');
      stats.className = 'country-stats';

      const sTotal = document.createElement('div');
      sTotal.className = 'glass-stat white';
      sTotal.innerHTML = `<div class="stat-number">${c.total}</div><div class="stat-label">کل</div>`;

      const sFree = document.createElement('div');
      sFree.className = 'glass-stat green';
      sFree.innerHTML = `<div class="stat-number">${c.free}</div><div class="stat-label">آزاد</div>`;

      const sUsed = document.createElement('div');
      sUsed.className = 'glass-stat red';
      sUsed.innerHTML = `<div class="stat-number">${c.used}</div><div class="stat-label">اشغال</div>`;

      stats.append(sTotal, sFree, sUsed);

      const btn = document.createElement('button');
      btn.textContent = 'مشاهده آدرس‌ها';
      btn.addEventListener('click', () => {
        if(!getUser()){
          // prompt login instead of calling API
          authSection.classList.remove('hidden');
          return;
        }
        loadAddresses(c.code);
      });

      card.append(header, stats, btn);
      el.appendChild(card);
    });
  } catch(e){
    if(e.status === 401){ handleUnauthorized(); }
  }
}

async function loadAddresses(code){
  const container = document.getElementById('addresses');
  container.innerHTML = `<div class="card"><div class="badge">${code}</div><div class="list" id="addr-list"></div></div>`;
  try {
    const data = await fetchJSON('/api/addresses?code=' + encodeURIComponent(code));
    const list = document.getElementById('addr-list');
    list.innerHTML = '';
    data.addresses.forEach(a => {
      const row = document.createElement('div');
      row.className = 'address-item';
      const ip = document.createElement('div');
      ip.textContent = a.ip;
      const st = document.createElement('div');
      st.className = 'status ' + (a.status === 'free' ? 'free' : 'used');
      st.textContent = a.status === 'free' ? 'آزاد' : 'اشغال';
      row.append(ip, st);
      list.appendChild(row);
    });
  } catch(e){
    if(e.status === 401){ handleUnauthorized(); }
  }
}

function handleUnauthorized(){
  clearUser();
  showAuth();
}

// Boot
(function init(){
  const uid = getUser();
  // Show app content for everyone; toggle actions based on login
  showApp(uid || null);
  // refresh stats periodically when logged in
  setInterval(()=>{
    if(!appSection.classList.contains('hidden')) loadCounts();
  }, 5000);
  // KV health polling
  async function pollHealth(){
    try {
      const r = await fetchJSON('/api/health');
      if(kvStatus){
        kvStatus.textContent = r.ok ? 'متصل' : 'قطع';
        kvStatus.style.background = r.ok ? 'rgba(74,222,128,.18)' : 'rgba(239,68,68,.18)';
      }
    } catch { if(kvStatus){ kvStatus.textContent = 'نامشخص'; } }
  }
  pollHealth();
  setInterval(pollHealth, 15000);
})();
