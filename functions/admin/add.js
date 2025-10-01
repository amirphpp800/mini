export const onRequestPost = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const body = await request.json();
    const { session: bodySession, name, code } = body || {};

    // Extract session from body, Authorization header (Bearer), or query string
    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = bodySession || (m && m[1]) || url.searchParams.get('session') || '';

    if (!session) {
      return new Response(JSON.stringify({ error: 'unauthorized', message: 'Admin session required' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Verify admin session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return new Response(JSON.stringify({ error: 'unauthorized', message: 'Invalid or expired admin session' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'invalid_input', message: 'Name and code are required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const iso = String(code).trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(iso)) {
      return new Response(JSON.stringify({ error: 'invalid_code', message: 'Invalid ISO country code' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const rec = { name, code: iso };
    await env.DB.put(name.toLowerCase(), JSON.stringify(rec));
    
    return new Response(JSON.stringify({ ok: true, country: rec }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
