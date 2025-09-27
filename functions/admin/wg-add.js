export const onRequestPost = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const body = await request.json();
    const { session: bodySession, country, endpoints, code, faName } = body || {};
    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = bodySession || (m && m[1]) || url.searchParams.get('session') || '';
    if (!session || !country || !Array.isArray(endpoints) || endpoints.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_input', message: 'Session, country and endpoints are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response(JSON.stringify({ error: 'unauthorized', message: 'Invalid or expired admin session.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const key = String(country).trim().toLowerCase();
    let countryData = await env.DB.get(key, { type: 'json' });

    // determine iso code
    let iso = String(code || (countryData && countryData.code) || '').trim().toLowerCase();
    if (!countryData && !/^[a-z]{2}$/.test(iso)) {
      return new Response(JSON.stringify({ error: 'invalid_country_code', message: 'ISO-3166 alpha-2 code required for new country.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // create or update country record (same as DNS)
    if (!countryData) {
      countryData = { name: country, code: iso };
      if (faName && typeof faName === 'string' && faName.trim()) countryData.faName = faName.trim();
      await env.DB.put(key, JSON.stringify(countryData));
    } else {
      let changed = false;
      if (/^[a-z]{2}$/.test(iso) && countryData.code !== iso) { countryData.code = iso; changed = true; }
      if (countryData.name !== country) { countryData.name = country; changed = true; }
      if (faName && typeof faName === 'string' && faName.trim() && countryData.faName !== faName.trim()) { countryData.faName = faName.trim(); changed = true; }
      if (changed) await env.DB.put(key, JSON.stringify(countryData));
    }

    // load current wg endpoints list
    const addrKey = `wg_ips:${key}`;
    const stored = await env.KV.get(addrKey);
    let list = stored ? JSON.parse(stored) : [];

    // validate IP:PORT (IPv4 only)
    const ipPortRegex = /^(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?):(\d{1,5})$/;
    const cleaned = [];
    const seen = new Set(list);
    for (const raw of endpoints) {
      const s = String(raw || '').trim();
      const m = ipPortRegex.exec(s);
      if (!m) continue;
      const port = Number(m[1]);
      if (port < 1 || port > 65535) continue;
      if (!seen.has(s)) { seen.add(s); cleaned.push(s); }
    }
    if (cleaned.length === 0) return new Response(JSON.stringify({ error: 'no_valid_endpoints', message: 'No valid endpoints (IPv4:PORT) provided.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // append new unique endpoints
    list = Array.from(seen);
    await env.KV.put(addrKey, JSON.stringify(list));

    return new Response(JSON.stringify({ ok: true, added: cleaned.length, total: list.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
