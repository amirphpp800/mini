import { json, requireAdmin, clearSession } from '../_utils/auth.js';

export async function onRequestPost({ request, env }){
  const sid = await requireAdmin(request, env);
  if(sid) await clearSession(env, sid);
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  const cookie = `session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${secure}`;
  return json({ ok:true }, 200, { 'Set-Cookie': cookie });
}
