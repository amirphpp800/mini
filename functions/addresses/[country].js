export const onRequestGet = async ({ request, params, env }) => {
  try {
    const country = params.country?.toLowerCase();
    if (!country) return new Response('Not found', { status: 404 });

    // Expect session token in Authorization: Bearer <token> or query ?session=
    const auth = request.headers.get('authorization') || '';
    let session = '';
    if (auth.toLowerCase().startsWith('bearer ')) {
      session = auth.slice(7).trim();
    } else {
      const url = new URL(request.url);
      session = url.searchParams.get('session') || '';
    }
    if (!session) return new Response('Unauthorized', { status: 401 });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response('Unauthorized', { status: 401 });

    // Optional: ensure user verified flag exists
    const verified = await env.KV.get(`user:${chat_id}:verified`);
    if (!verified) return new Response('Forbidden', { status: 403 });

    const allRaw = await env.KV.get(`ips:${country}`);
    const all = allRaw ? JSON.parse(allRaw) : [];

    return new Response(JSON.stringify({ country, addresses: all }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
