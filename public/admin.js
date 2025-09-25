async function fetchJSON(url, opts={}){
  const res = await fetch(url, {headers:{'Content-Type':'application/json'}, credentials:'include', ...opts});
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

const loginSection = document.getElementById('login-section');
const manageSection = document.getElementById('manage-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const addCountryForm = document.getElementById('add-country-form');
const addAddressForm = document.getElementById('add-address-form');
const countrySelect = document.getElementById('country-select');
const feedback = document.getElementById('admin-feedback');
const loginError = document.getElementById('login-error');

function showManage(){ loginSection.classList.add('hidden'); manageSection.classList.remove('hidden'); }
function showLogin(){ manageSection.classList.add('hidden'); loginSection.classList.remove('hidden'); }

loginForm.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const fd = new FormData(loginForm);
  try {
    await fetchJSON('/api/auth-login', { method:'POST', body: JSON.stringify({
      username: fd.get('username'), password: fd.get('password')
    })});
    await loadCountries();
    showManage();
  } catch(e){ loginError.textContent = 'ورود ناموفق'; }
});

logoutBtn.addEventListener('click', async ()=>{
  try { await fetchJSON('/api/auth-logout', { method:'POST' }); } catch(e){}
  showLogin();
});

async function loadCountries(){
  const data = await fetchJSON('/api/countries');
  countrySelect.innerHTML = '';
  data.countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code; opt.textContent = `${c.name} (${c.code})`;
    countrySelect.appendChild(opt);
  });
}

addCountryForm.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const fd = new FormData(addCountryForm);
  const name = (fd.get('name')||'').trim();
  let code = (fd.get('code')||'').trim().toUpperCase();
  // Validate country code: exactly 2 letters A-Z
  if(!/^[A-Z]{2}$/.test(code)){
    feedback.textContent = 'کد کشور باید دو حرف انگلیسی باشد (مثال: GB)';
    feedback.className = 'text-danger';
    return;
  }
  try {
    await fetchJSON('/api/countries', { method:'POST', body: JSON.stringify({ name, code })});
    feedback.textContent = 'کشور اضافه شد';
    feedback.className = 'text-success';
    addCountryForm.reset();
    await loadCountries();
  } catch(e){ 
    feedback.textContent = 'خطا: ' + e.message;
    feedback.className = 'text-danger';
  }
});

addAddressForm.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const fd = new FormData(addAddressForm);
  const code = (fd.get('code')||'').toString().trim().toUpperCase();
  const ips = (fd.get('ips')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  // Client-side IPv4 validation for better UX
  const IPv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
  const invalid = ips.filter(ip => !IPv4.test(ip));
  if(invalid.length){
    feedback.textContent = `برخی IP ها نامعتبرند: ${invalid.join(', ')}`;
    feedback.className = 'text-danger';
    return;
  }
  try {
    await fetchJSON('/api/addresses', { method:'POST', body: JSON.stringify({ code, ips })});
    feedback.textContent = 'آدرس‌ها اضافه شدند';
    feedback.className = 'text-success';
    addAddressForm.reset();
  } catch(e){ 
    feedback.textContent = 'خطا: ' + e.message;
    feedback.className = 'text-danger';
  }
});
