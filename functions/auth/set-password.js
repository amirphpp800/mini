function toHex(buf){
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randHex(bytes){
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function pbkdf2(password, saltHex, iterations=100000){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveBits']);
  const salt = new Uint8Array((saltHex.match(/.{1,2}/g)||[]).map(h=>parseInt(h,16)));
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations}, keyMaterial, 256);
  return toHex(bits);
}

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = request.headers.get('authorization') || '';
    let session = '';
    if (auth.toLowerCase().startsWith('bearer ')) session = auth.slice(7).trim();
    else {
      const url = new URL(request.url);
      session = url.searchParams.get('session') || '';
    }
    if(!session) return new Response(JSON.stringify({ error:'unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });

    const chat_id = await env.KV.get(`session:${session}`);
    if(!chat_id) return new Response(JSON.stringify({ error:'unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });

    const { new_password } = await request.json().catch(()=>({}));
    const pwd = String(new_password||'');
    if(pwd.length < 6) return new Response(JSON.stringify({ error:'weak_password', message:'Password must be at least 6 characters' }), { status:400, headers:{'Content-Type':'application/json'} });

    const salt = randHex(16);
    const iter = 100000;
    const hash = await pbkdf2(pwd, salt, iter);
    const rec = { salt, iter, hash };
    await env.KV.put(`user:pwd:${chat_id}`, JSON.stringify(rec));

    return new Response(JSON.stringify({ ok:true }), { headers:{'Content-Type':'application/json'} });
  } catch (e) {
    return new Response(JSON.stringify({ error:'server_error' }), { status:500, headers:{'Content-Type':'application/json'} });
  }
};
