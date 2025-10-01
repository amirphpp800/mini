import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    const body = await request.json();
    const { name, code } = body || {};

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
