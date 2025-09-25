import { json } from '../_utils/auth.js';

export async function onRequestGet({ env }){
  try {
    const key = 'app:health:ping';
    // try a lightweight write with TTL then read
    await env.DB.put(key, 'ok', { expirationTtl: 60 });
    const v = await env.DB.get(key);
    const ok = v === 'ok';
    return json({ ok });
  } catch(e){
    return json({ ok:false, error: String(e) }, 200);
  }
}
