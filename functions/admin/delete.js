export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, country } = body || {};
    if (!session || !country) {
      return new Response('Invalid input', { status: 400 });
    }

    // Verify session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const key = String(country).trim().toLowerCase();
    if (!key) {
      return new Response('Invalid country', { status: 400 });
    }

    // Delete country record and related IP list
    await env.DB.delete(key).catch(() => {});
    await env.KV.delete(`ips:${key}`).catch(() => {});
    // Optionally delete stats if you store them
    await env.KV.delete(`stats:${key}`).catch(() => {});

    return new Response('Deleted', { status: 200 });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
