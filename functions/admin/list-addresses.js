export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, country } = body || {};
    if (!session || !country) return new Response('Invalid input', { status: 400 });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response('Unauthorized', { status: 401 });

    const key = String(country).trim().toLowerCase();
    if (!key) return new Response('Invalid country', { status: 400 });

    const ipsRaw = await env.KV.get(`ips:${key}`);
    const ips = ipsRaw ? JSON.parse(ipsRaw) : [];

    return new Response(JSON.stringify({ country: key, addresses: ips }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
