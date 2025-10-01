export const onRequestPost = async ({ request, env }) => {
  try {
    // Helper function to normalize country names
    function normalizeCountryName(country) {
      const normalized = String(country || '').toLowerCase().trim();
      // Normalize England, UK, United Kingdom to a single name
      if (normalized === 'england' || normalized === 'uk' || normalized === 'united kingdom' || normalized === 'great britain') {
        return 'United Kingdom';
      }
      // Normalize America, USA, United States to a single name
      if (normalized === 'america' || normalized === 'usa' || normalized === 'united states' || normalized === 'united states of america') {
        return 'United States';
      }
      // Return original country name with proper capitalization
      return String(country || '').trim();
    }

    const url = new URL(request.url);
    const body = await request.json();
    const { session: bodySession, country: rawCountry, addresses, code, faName } = body || {};
    const country = normalizeCountryName(rawCountry);

    // Extract session from body, Authorization header (Bearer), or query string
    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = bodySession || (m && m[1]) || url.searchParams.get('session') || '';

    // Validate basic inputs
    if (!session || !country || !Array.isArray(addresses) || addresses.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_input', message: 'Session, country and addresses are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'Invalid or expired admin session.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const key = country.toLowerCase();
    let countryData = await env.DB.get(key, { type: 'json' });

    // Determine ISO code: prefer explicit code, else from existing record
    let iso = String(code || (countryData && countryData.code) || '').trim().toLowerCase();
    if (!countryData && !/^[a-z]{2}$/.test(iso)) {
      // For creating a new country, ISO code is required and must be valid
      return new Response(JSON.stringify({ error: 'invalid_country_code', message: 'ISO-3166 alpha-2 code required for new country.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Create or update minimal country record with name and ISO code
    if (!countryData) {
      countryData = { name: country, code: iso };
      if (faName && typeof faName === 'string' && faName.trim()) {
        countryData.faName = faName.trim();
      }
      await env.DB.put(key, JSON.stringify(countryData));
    } else {
      let changed = false;
      if (/^[a-z]{2}$/.test(iso) && countryData.code !== iso) { countryData.code = iso; changed = true; }
      if (countryData.name !== country) { countryData.name = country; changed = true; }
      if (faName && typeof faName === 'string' && faName.trim() && countryData.faName !== faName.trim()) {
        countryData.faName = faName.trim();
        changed = true;
      }
      if (changed) await env.DB.put(key, JSON.stringify(countryData));
    }

    // Store addresses list in a separate KV namespace
    const addrKey = `ips:${key}`;
    let stored = await env.KV.get(addrKey);
    let list = stored ? JSON.parse(stored) : [];

    // Validate IPv4 and dedupe
    const ipv4 = (addresses||[])
      .map(String)
      .map(s=>s.trim())
      .filter(Boolean)
      .filter(s=>/^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(s));
    if (ipv4.length === 0) {
      return new Response(JSON.stringify({ error: 'no_valid_ipv4', message: 'No valid IPv4 addresses provided.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Count actually added IPs (not duplicates)
    let added = 0;
    for (const ip of ipv4) {
      if (!list.includes(ip)) {
        list.push(ip);
        added++;
      }
    }

    await env.KV.put(addrKey, JSON.stringify(list));

    return new Response(JSON.stringify({ ok: true, added, total: list.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
