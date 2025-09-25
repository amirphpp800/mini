export async function readJSON(request){
  try { return await request.json(); } catch { return {}; }
}

export function json(data, status=200, headers={}){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

export function unauthorized(){ return json({ error: 'unauthorized' }, 401); }

export async function requireAdmin(request, env){
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if(!match) return null;
  const sid = match[1];
  const v = await env.DB.get(`app:sessions:${sid}`);
  return v === 'admin' ? sid : null;
}

// Require a normal registered user based on a simple cookie `user=<telegramId>`
export async function requireUser(request, env){
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)user=([^;]+)/);
  if(!m) return null;
  const userId = decodeURIComponent(m[1]);
  const exists = await env.DB.get(`app:user:${userId}`);
  return exists ? userId : null;
}

export async function setSession(env){
  const sid = crypto.randomUUID();
  await env.DB.put(`app:sessions:${sid}`, 'admin', { expirationTtl: 60*60*24 });
  return sid;
}

export async function clearSession(env, sid){
  if(sid) await env.DB.delete(`app:sessions:${sid}`);
}

export function makeSessionCookie(request, sid){
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `session=${sid}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

// Create a long-lived user cookie for the verified user (non-HttpOnly so frontend can clear if needed)
export function makeUserCookie(request, userId){
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  // 365 days
  return `user=${encodeURIComponent(userId)}; Path=/; Max-Age=${60*60*24*365}; SameSite=Lax${secure}`;
}
