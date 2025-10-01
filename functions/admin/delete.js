export const onRequestPost = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const body = await request.json();
    const { session: bodySession, country } = body || {};
    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = bodySession || (m && m[1]) || url.searchParams.get('session') || '';
    if (!session || !country) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const key = String(country).trim().toLowerCase();
    if (!key) {
      return new Response(JSON.stringify({ error: 'invalid_country' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Delete country record and all related data
    try {
      await Promise.all([
        // Delete from DB
        env.DB.delete(key),
        // Delete DNS-related keys
        env.KV.delete(`ips:${key}`),
        env.KV.delete(`ips_busy:${key}`),
        env.KV.delete(`stats:${key}`),
        // Delete WireGuard-related keys
        env.KV.delete(`wg_ips:${key}`),
        env.KV.delete(`wg_busy:${key}`),
        // Delete APN-related keys
        env.KV.delete(`apn_list:${key}`),
        env.KV.delete(`apn_busy:${key}`)
      ]);
    } catch (deleteError) {
      // Continue even if some deletions fail
      console.error('Some deletions failed:', deleteError);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
