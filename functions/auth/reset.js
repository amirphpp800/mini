function toHex(buf){
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function pbkdf2(password, saltHex, iterations=100000){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveBits']);
  const salt = new Uint8Array((saltHex.match(/.{1,2}/g)||[]).map(h=>parseInt(h,16)));
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations}, keyMaterial, 256);
  return toHex(bits);
}
function randHex(bytes){
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export const onRequestPost = async ({ request, env }) => {
  try{
    const { chat_id, code, new_password } = await request.json().catch(()=>({}));
    if(!chat_id || !code || !new_password){
      return new Response(JSON.stringify({ error:'invalid_input' }), { status:400, headers:{'Content-Type':'application/json'} });
    }
    const saved = await env.KV.get(`otp:reset:${chat_id}`);
    if(!saved) return new Response(JSON.stringify({ error:'expired', message:'Code expired or not found' }), { status:400, headers:{'Content-Type':'application/json'} });
    if(String(saved) !== String(code)){
      return new Response(JSON.stringify({ error:'invalid_code' }), { status:401, headers:{'Content-Type':'application/json'} });
    }
    const pwd = String(new_password||'');
    if(pwd.length < 6){
      return new Response(JSON.stringify({ error:'weak_password', message:'Password must be at least 6 characters' }), { status:400, headers:{'Content-Type':'application/json'} });
    }
    const salt = randHex(16);
    const iter = 100000;
    const hash = await pbkdf2(pwd, salt, iter);
    await env.KV.put(`user:pwd:${chat_id}`, JSON.stringify({ salt, iter, hash }));
    await env.KV.delete(`otp:reset:${chat_id}`);
    // return success
    return new Response(JSON.stringify({ ok:true }), { headers:{'Content-Type':'application/json'} });
  }catch(e){
    return new Response(JSON.stringify({ error:'server_error' }), { status:500, headers:{'Content-Type':'application/json'} });
  }
};
