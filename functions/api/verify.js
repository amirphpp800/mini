import { json, readJSON, makeUserCookie } from '../_utils/auth.js';
import { kvGet, kvSet, kvDel } from '../_utils/kv.js';

export async function onRequestPost({ request, env }){
  const { telegramId, code } = await readJSON(request);
  if(!telegramId || !code) return json({ error:'invalid' }, 400);
  const stored = await kvGet(env, `app:verification:${telegramId}`);
  if(!stored) return json({ error:'expired' }, 400);
  if(stored !== code) return json({ error:'mismatch' }, 400);
  await kvDel(env, `app:verification:${telegramId}`);
  await kvSet(env, `app:user:${telegramId}`, { verified: true, createdAt: Date.now() });
  const cookie = makeUserCookie(request, telegramId);
  return json({ ok:true, userId: String(telegramId) }, 200, { 'Set-Cookie': cookie });
}
