export const onRequestPost = async ({ request, env }) => {
  try {
    const { chat_id, code } = await request.json();
    if (!chat_id || !code) {
      return new Response('chat_id and code required', { status: 400 });
    }

    const saved = await env.KV.get(`otp:${chat_id}`);
    if (!saved) {
      return new Response('Code expired or not found', { status: 400 });
    }

    if (saved !== code) {
      return new Response('Invalid code', { status: 401 });
    }

    // Generate simple session token
    const session = crypto.randomUUID();
    await env.KV.put(`session:${session}`, chat_id, { expirationTtl: 86400 }); // 1 day
    await env.KV.delete(`otp:${chat_id}`);
    // mark user as verified (can be used later)
    await env.KV.put(`user:${chat_id}:verified`, '1', { expirationTtl: 86400 });

    return new Response(JSON.stringify({ session }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response('Error', { status: 500 });
  }
};
