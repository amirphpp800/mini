export const onRequestPost = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const { code } = body || {};

    // session from Authorization or query
    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = (m && m[1]) || url.searchParams.get('session') || '';
    if (!session) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const norm = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!norm) return new Response(JSON.stringify({ error: 'invalid_code', message: 'Invalid code' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const giftKey = `gift:${norm}`;
    const raw = await env.KV.get(giftKey);
    if (!raw) return new Response(JSON.stringify({ error: 'not_found', message: 'Gift code not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    const gift = JSON.parse(raw);
    const usedKey = `gift_used:${norm}:${chat_id}`;
    const already = await env.KV.get(usedKey);

    if (gift.per_user_once && already) {
      return new Response(JSON.stringify({ error: 'already_used', message: 'You have already used this gift code' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    // Check max uses
    const max = Number(gift.max_uses || 0);
    const used = Number(gift.used || 0);
    if (max > 0 && used >= max) {
      return new Response(JSON.stringify({ error: 'exhausted', message: 'Gift code usage limit reached' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
    }

    // Apply to balance
    const balKey = `balance:${chat_id}`;
    const balRaw = await env.KV.get(balKey);
    const current = balRaw ? parseFloat(balRaw) : 0;
    const amount = Number(gift.amount || 0);
    const next = +(current + amount).toFixed(2);
    await env.KV.put(balKey, String(next));

    // Mark per-user usage
    if (gift.per_user_once) {
      await env.KV.put(usedKey, '1');
    }

    // Increment total used
    const newGift = { ...gift, used: used + 1 };
    await env.KV.put(giftKey, JSON.stringify(newGift));

    return new Response(JSON.stringify({ ok: true, amount, balance: next }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
