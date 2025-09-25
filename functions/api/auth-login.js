import { json, readJSON, setSession, makeSessionCookie } from '../_utils/auth.js';

export async function onRequestPost({ request, env }){
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = env;
  const { username, password } = await readJSON(request);
  if(username === ADMIN_USERNAME && password === ADMIN_PASSWORD){
    const sid = await setSession(env);
    const cookie = makeSessionCookie(request, sid);
    return json({ ok:true }, 200, { 'Set-Cookie': cookie });
  }
  return json({ error:'invalid' }, 401);
}
