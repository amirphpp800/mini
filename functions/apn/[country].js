export const onRequestGet = async ({ request, params, env }) => {
  try {
    const country = params.country?.toLowerCase();
    if (!country) return new Response('Not found', { status: 404 });

    // Read session
    const auth = request.headers.get('authorization') || '';
    let session = '';
    if (auth.toLowerCase().startsWith('bearer ')) session = auth.slice(7).trim();
    else {
      const url = new URL(request.url);
      session = url.searchParams.get('session') || '';
    }
    if (!session) return new Response('Unauthorized', { status: 401 });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response('Unauthorized', { status: 401 });

    // Require verified user
    const verified = await env.KV.get(`user:${chat_id}:verified`);
    if (!verified) return new Response('Forbidden', { status: 403 });

    // Pricing for APN (default 1.5 USD)
    let priceRaw = await env.KV.get('pricing:apn');
    let price = parseFloat(priceRaw || '1.5');
    if (!Number.isFinite(price) || price < 0) price = 1.5;

    // Load APN domains and busy counters
    const listRaw = await env.KV.get(`apn_list:${country}`);
    const all = listRaw ? JSON.parse(listRaw) : [];
    const busyRaw = await env.KV.get(`apn_busy:${country}`);
    const busyMap = busyRaw ? JSON.parse(busyRaw) : {}; // { domain: countAssigned }

    // Per-user history to avoid giving same APN again
    const userHistKey = `apn_user_hist:${chat_id}:${country}`;
    const histRaw = await env.KV.get(userHistKey);
    const userHist = histRaw ? JSON.parse(histRaw) : [];
    const userSet = new Set(userHist);

    // Find first domain with capacity < 3 and not given to this user before
    const candidate = all.find(d => {
      const key = String(d || '').toLowerCase();
      const count = Number(busyMap[key] || 0);
      return count < 3 && !userSet.has(key);
    });

    if (!candidate) {
      return new Response(JSON.stringify({ country, apn: [] }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Check and deduct balance
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

    // Assign and persist
    const key = String(candidate).toLowerCase();
    const newCount = Math.min(3, Number(busyMap[key] || 0) + 1);
    busyMap[key] = newCount;
    await env.KV.put(`apn_busy:${country}`, JSON.stringify(busyMap));

    userSet.add(key);
    await env.KV.put(userHistKey, JSON.stringify(Array.from(userSet)));

    return new Response(JSON.stringify({ country, apn: [candidate] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
