export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, country } = body || {};
    if (!session || !country) return new Response('Invalid input', { status: 400 });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response('Unauthorized', { status: 401 });

    const key = String(country).trim().toLowerCase();
    await env.KV.put(`wg_busy:${key}`, JSON.stringify([]));

    return new Response('OK', { status: 200 });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
