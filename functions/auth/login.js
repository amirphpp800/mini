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

export const onRequestPost = async ({ request, env }) => {
  try {
    const { chat_id, password } = await request.json().catch(()=>({}));
    if(!chat_id || !password){ return new Response(JSON.stringify({ error:'invalid_input' }), { status:400, headers:{'Content-Type':'application/json'} }); }

    const recRaw = await env.KV.get(`user:pwd:${chat_id}`);
    if(!recRaw){ return new Response(JSON.stringify({ error:'no_password' }), { status:404, headers:{'Content-Type':'application/json'} }); }
    let rec; try{ rec = JSON.parse(recRaw); }catch{ rec = null; }
    if(!rec || !rec.salt || !rec.hash || !rec.iter){ return new Response(JSON.stringify({ error:'corrupt' }), { status:500, headers:{'Content-Type':'application/json'} }); }

    const hash = await pbkdf2(password, rec.salt, rec.iter);
    if(hash !== rec.hash){ return new Response(JSON.stringify({ error:'invalid_credentials' }), { status:401, headers:{'Content-Type':'application/json'} }); }

    const session = crypto.randomUUID();
    await env.KV.put(`session:${session}`, String(chat_id), { expirationTtl: 2592000 });
    // ensure verified flag to allow usage flows
    try{ await env.KV.put(`user:${chat_id}:verified`, '1'); }catch(_){ }

    return new Response(JSON.stringify({ session }), { headers:{'Content-Type':'application/json'} });
  } catch (e) {
    return new Response(JSON.stringify({ error:'server_error' }), { status:500, headers:{'Content-Type':'application/json'} });
  }
};
