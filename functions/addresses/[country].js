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

    // If the user already has an assigned IP for this country, return it
    const userKey = `user_ip:${chat_id}:${country}`;
    const existing = await env.KV.get(userKey);
    if (existing) {
      return new Response(JSON.stringify({ country, addresses: [existing] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load all IPs and busy list
    const allRaw = await env.KV.get(`ips:${country}`);
    const all = allRaw ? JSON.parse(allRaw) : [];
    const busyRaw = await env.KV.get(`ips_busy:${country}`);
    let busy = busyRaw ? JSON.parse(busyRaw) : [];

    // Find first free IP
    const busySet = new Set(busy);
    const freeIp = all.find(ip => !busySet.has(ip));

    if (!freeIp) {
      return new Response(JSON.stringify({ country, addresses: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mark as assigned: save mapping for user and append to busy list (dedup)
    busySet.add(freeIp);
    busy = Array.from(busySet);
    await env.KV.put(`ips_busy:${country}`, JSON.stringify(busy));
    await env.KV.put(userKey, freeIp);

    return new Response(JSON.stringify({ country, addresses: [freeIp] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
