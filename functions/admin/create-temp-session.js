export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { session, chat_id } = body || {};

    // Verify admin session
    if (!session) return new Response('Unauthorized', { status: 401 });
    
    const admin_chat_id = await env.KV.get(`session:${session}`);
    if (!admin_chat_id) return new Response('Unauthorized', { status: 401 });

    // Check if the admin is authorized
    const verified = await env.KV.get(`user:${admin_chat_id}:verified`);
    if (!verified) return new Response('Forbidden', { status: 403 });

    // Create a temporary session for the target user
    const temp_session = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the temporary session with 5 minute expiration
    await env.KV.put(`session:${temp_session}`, String(chat_id), { expirationTtl: 300 });

    return new Response(JSON.stringify({ 
      ok: true, 
      temp_session,
      expires_in: 300 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
