import { json, readJSON, requireAdmin, requireUser } from '../_utils/auth.js';
import { kvGet, kvSet } from '../_utils/kv.js';

export async function onRequestGet({ request, env }){
  const uid = await requireUser(request, env);
  if(!uid) return json({ error:'unauthorized' }, 401);
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').toUpperCase();
  if(!code) return json({ error:'code' }, 400);
  const addresses = (await kvGet(env, `app:country:${code}:addresses`)) || [];
  return json({ code, addresses });
}

export async function onRequestPost({ request, env }){
  const sid = await requireAdmin(request, env);
  if(!sid) return json({ error:'unauthorized' }, 401);
  const { code, ips } = await readJSON(request);
  if(!code || !Array.isArray(ips)) return json({ error:'invalid' }, 400);
  const up = code.toUpperCase();
  const list = (await kvGet(env, `app:country:${up}:addresses`)) || [];
  const set = new Set(list.map(a=>a.ip));
  const IPv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
  const invalid = [];
  const toAdd = [];
  ips.forEach(raw=>{
    const ip = String(raw).trim();
    if(!IPv4.test(ip)) { invalid.push(ip); return; }
    if(!set.has(ip)) { set.add(ip); toAdd.push({ ip, status:'free' }); }
  });
  if(invalid.length){
    return json({ error:'invalid_ips', invalid }, 400);
  }
  toAdd.forEach(a=> list.push(a));
  await kvSet(env, `app:country:${up}:addresses`, list);
  return json({ ok:true });
}

export async function onRequestPatch({ request, env }){
  const sid = await requireAdmin(request, env);
  if(!sid) return json({ error:'unauthorized' }, 401);
  const { code, ip, status } = await readJSON(request);
  if(!code || !ip || !['free','used'].includes(status)) return json({ error:'invalid' }, 400);
  const up = code.toUpperCase();
  const list = (await kvGet(env, `app:country:${up}:addresses`)) || [];
  const item = list.find(a=>a.ip===ip);
  if(!item) return json({ error:'not found' }, 404);
  item.status = status;
  await kvSet(env, `app:country:${up}:addresses`, list);
  return json({ ok:true });
}
