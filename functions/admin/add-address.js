export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, country, addresses, code, faName } = body;

    // session, country, and at least one valid address are required. code is optional for existing countries
    if (!session || !country || !Array.isArray(addresses) || addresses.length === 0) {
      return new Response('Invalid input', { status: 400 });
    }

    // Verify session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const key = country.toLowerCase();
    let countryData = await env.DB.get(key, { type: 'json' });

    // Determine ISO code: prefer explicit code, else from existing record
    let iso = String(code || (countryData && countryData.code) || '').trim().toLowerCase();
    if (!countryData && !/^[a-z]{2}$/.test(iso)) {
      // For creating a new country, ISO code is required and must be valid
      return new Response('Invalid country code', { status: 400 });
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
    ipv4.forEach((ip) => {
      if (!list.includes(ip)) list.push(ip);
    });

    await env.KV.put(addrKey, JSON.stringify(list));

    return new Response('Addresses added', { status: 200 });
  } catch (err) {
    return new Response('Error', { status: 500 });
  }
};
