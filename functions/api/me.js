import { json, requireUser } from '../_utils/auth.js';
import { kvGet } from '../_utils/kv.js';

export async function onRequestGet({ request, env }){
  const uid = await requireUser(request, env);
  if(!uid) return json({ error:'unauthorized' }, 401);

  // Basic profile
  const profile = (await kvGet(env, `app:user:${uid}`)) || { verified: true };

  // Collect owned IPs by scanning countries' addresses for owner==uid
  const countries = (await kvGet(env, 'app:countries')) || [];
  const owned = [];
  for(const c of countries){
    const list = (await kvGet(env, `app:country:${c.code}:addresses`)) || [];
    list.forEach(a => { if(a.owner === String(uid)) owned.push({ country: c.code, ip: a.ip }); });
  }

  return json({ userId: uid, profile, owned });
}
