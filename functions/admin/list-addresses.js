export const onRequestPost = async ({ request, env }) => {
  try {
    // Helper function to normalize country names
    function normalizeCountryName(country) {
      const normalized = String(country || '').toLowerCase().trim();
      // Normalize England, UK, United Kingdom to a single name
      if (normalized === 'england' || normalized === 'uk' || normalized === 'united kingdom' || normalized === 'great britain') {
        return 'united kingdom';
      }
      // Normalize America, USA, United States to a single name
      if (normalized === 'america' || normalized === 'usa' || normalized === 'united states' || normalized === 'united states of america') {
        return 'united states';
      }
      // Return normalized lowercase country name
      return normalized;
    }

    const url = new URL(request.url);
    const body = await request.json();
    const { session: bodySession, country: rawCountry } = body || {};
    const country = normalizeCountryName(rawCountry);
    const auth = request.headers.get('Authorization') || '';
    const m = /^Bearer\s+(.+)/i.exec(auth);
    const session = bodySession || (m && m[1]) || url.searchParams.get('session') || '';
    if (!session || !country) return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const key = String(country).trim().toLowerCase();
    if (!key) return new Response(JSON.stringify({ error: 'invalid_country' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const ipsRaw = await env.KV.get(`ips:${key}`);
    const ips = ipsRaw ? JSON.parse(ipsRaw) : [];

    return new Response(JSON.stringify({ country: key, addresses: ips }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
