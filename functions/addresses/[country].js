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

    // Read pricing for DNS (default 0.5 USD)
    let priceRaw = await env.KV.get('pricing:dns');
    let price = parseFloat(priceRaw || '0.5');
    if (!Number.isFinite(price) || price < 0) price = 0.5;

    // Each request should return a new unique address (no repeat for this user).
    // We'll track per-user history and skip previously assigned IPs.
    const userHistKey = `user_hist:${chat_id}:${country}`;
    const histRaw = await env.KV.get(userHistKey);
    const userHist = histRaw ? JSON.parse(histRaw) : [];
    const userHistSet = new Set(userHist);

    // Load all IPs and busy list
    const allRaw = await env.KV.get(`ips:${country}`);
    const all = allRaw ? JSON.parse(allRaw) : [];
    const busyRaw = await env.KV.get(`ips_busy:${country}`);
    let busy = busyRaw ? JSON.parse(busyRaw) : [];

    // Find first free IP that is not busy and not in user's history
    const busySet = new Set(busy);
    const freeIp = all.find(ip => !busySet.has(ip) && !userHistSet.has(ip));

    if (!freeIp) {
      return new Response(JSON.stringify({ country, addresses: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check and deduct user balance atomically-ish
    const balKey = `balance:${chat_id}`;
    const balRaw = await env.KV.get(balKey);
    const current = balRaw ? parseFloat(balRaw) : 0;
    const balance = Number.isFinite(current) ? current : 0;
    if (balance < price) {
      return new Response(JSON.stringify({ error: 'insufficient_balance', needed: +price.toFixed(2), balance: +balance.toFixed(2) }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const next = +(balance - price).toFixed(2);
    await env.KV.put(balKey, String(next));

    // Mark as consumed globally and record in user's history
    busySet.add(freeIp);
    busy = Array.from(busySet);
    await env.KV.put(`ips_busy:${country}`, JSON.stringify(busy));
    userHistSet.add(freeIp);
    await env.KV.put(userHistKey, JSON.stringify(Array.from(userHistSet)));

    return new Response(JSON.stringify({ country, addresses: [freeIp] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
