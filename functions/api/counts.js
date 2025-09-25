import { json } from '../_utils/auth.js';
import { kvGet } from '../_utils/kv.js';

export async function onRequestGet({ env }){
  const countries = (await kvGet(env, 'app:countries')) || [];
  let total = 0, free = 0, used = 0;
  for(const c of countries){
    const list = (await kvGet(env, `app:country:${c.code}:addresses`)) || [];
    total += list.length;
    // Handle addresses that might not have status field (legacy data)
    free += list.filter(a=>!a.status || a.status==='free').length;
    used += list.filter(a=>a.status==='used').length;
  }
  return json({ totalIPs: total, freeIPs: free, usedIPs: used });
}
