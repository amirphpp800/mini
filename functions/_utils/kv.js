export async function kvGet(env, key){
  const v = await env.DB.get(key);
  if(v == null) return null;
  try { return JSON.parse(v); } catch { return v; }
}
export async function kvSet(env, key, value){
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  await env.DB.put(key, v);
}
export async function kvDel(env, key){
  await env.DB.delete(key);
}
export async function kvExpire(env, key, seconds){
  // Cloudflare KV supports expiration via metadata or options on put; emulate by re-put with expiration
  // Note: For Page Functions, we can use expiration in put options
  const v = await env.DB.get(key);
  if(v != null){
    await env.DB.put(key, v, { expirationTtl: seconds });
  }
}
export function randomId(){
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function randomCode(){ return ('' + Math.floor(10000 + Math.random()*90000)); }
