import { json, readJSON, requireAdmin, requireUser } from '../_utils/auth.js';
import { kvGet, kvSet } from '../_utils/kv.js';

async function ensureDefault(env){
  let countries = await kvGet(env, 'app:countries');
  if(!countries || !Array.isArray(countries) || countries.length === 0){
    countries = [{ name:'United Kingdom', code:'GB' }];
    await kvSet(env, 'app:countries', countries);
    await kvSet(env, 'app:country:GB:addresses', []);
  }
}

export async function onRequestGet({ request, env }){
  // Allow viewing countries without login, but show stats only for logged users
  await ensureDefault(env);
  const countries = (await kvGet(env, 'app:countries')) || [];
  const uid = await requireUser(request, env);
  
  if(uid){
    // Logged in: show full stats
    const enriched = [];
    for(const c of countries){
      const list = (await kvGet(env, `app:country:${c.code}:addresses`)) || [];
      const total = list.length;
      // Handle addresses that might not have status field (legacy data)
      const free = list.filter(a=>!a.status || a.status==='free').length;
      const used = list.filter(a=>a.status==='used').length;
      enriched.push({ ...c, total, free, used });
    }
    return json({ countries: enriched, authenticated: true });
  } else {
    // Not logged in: show countries without stats
    const basic = countries.map(c => ({ ...c, total: 0, free: 0, used: 0 }));
    return json({ countries: basic, authenticated: false });
  }
}

export async function onRequestPost({ request, env }){
  const sid = await requireAdmin(request, env);
  if(!sid) return json({ error:'unauthorized' }, 401);
  const { name, code } = await readJSON(request);
  if(!name || !code) return json({ error:'invalid' }, 400);
  const up = code.toUpperCase();
  const countries = (await kvGet(env, 'app:countries')) || [];
  if(countries.find(c=>c.code===up)) return json({ error:'exists' }, 400);
  countries.push({ name, code: up });
  await kvSet(env, 'app:countries', countries);
  await kvSet(env, `app:country:${up}:addresses`, []);
  return json({ ok:true });
}
