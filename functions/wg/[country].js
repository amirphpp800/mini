export const onRequestGet = async ({ request, params, env }) => {
  try {
    const country = params.country?.toLowerCase();
    if (!country) return new Response('Not found', { status: 404 });

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

    const verified = await env.KV.get(`user:${chat_id}:verified`);
    if (!verified) return new Response('Forbidden', { status: 403 });

    // Read pricing for WG (default 1.00 USD)
    let priceRaw = await env.KV.get('pricing:wg');
    let price = parseFloat(priceRaw || '1.0');
    if (!Number.isFinite(price) || price < 0) price = 1.0;

    const userHistKey = `wg_user_hist:${chat_id}:${country}`;
    const histRaw = await env.KV.get(userHistKey);
    const userHist = histRaw ? JSON.parse(histRaw) : [];
    const userHistSet = new Set(userHist);

    const allRaw = await env.KV.get(`wg_ips:${country}`);
    const all = allRaw ? JSON.parse(allRaw) : [];
    const busyRaw = await env.KV.get(`wg_busy:${country}`);
    let busy = busyRaw ? JSON.parse(busyRaw) : [];

    const busySet = new Set(busy);
    const freeEp = all.find(ep => !busySet.has(ep) && !userHistSet.has(ep));

    if (!freeEp) {
      return new Response(JSON.stringify({ country, addresses: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check and deduct user balance
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

    busySet.add(freeEp);
    busy = Array.from(busySet);
    await env.KV.put(`wg_busy:${country}`, JSON.stringify(busy));
    userHistSet.add(freeEp);
    await env.KV.put(userHistKey, JSON.stringify(Array.from(userHistSet)));

    return new Response(JSON.stringify({ country, addresses: [freeEp] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}

