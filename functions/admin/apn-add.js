export const onRequestPost = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const body = await request.json();
    const { session: bodySession, country, apn = [], code, faName } = body || {};

    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = bodySession || (m && m[1]) || url.searchParams.get('session') || '';

    if (!session || !country || !Array.isArray(apn) || apn.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_input', message: 'Session, country and apn list are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const key = String(country).trim().toLowerCase();
    let countryData = await env.DB.get(key, { type: 'json' });

    // Determine ISO code
    let iso = String(code || (countryData && countryData.code) || '').trim().toLowerCase();
    if (!countryData && !/^[a-z]{2}$/.test(iso)) {
      return new Response(JSON.stringify({ error: 'invalid_country_code', message: 'ISO-3166 alpha-2 code required for new country.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

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

    // Validate domains and dedupe
    const domainRegex = /^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
    const listKey = `apn_list:${key}`;
    const raw = await env.KV.get(listKey);
    const existing = raw ? JSON.parse(raw) : [];
    const set = new Set(existing);

    let added = 0;
    for (const dRaw of apn) {
      const d = String(dRaw || '').trim().toLowerCase();
      if (!d) continue;
      if (!domainRegex.test(d)) continue;
      if (!set.has(d)) { set.add(d); added += 1; }
    }
    const finalList = Array.from(set);
    await env.KV.put(listKey, JSON.stringify(finalList));

    return new Response(JSON.stringify({ ok: true, added, total: finalList.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
