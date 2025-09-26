export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const ips = Array.isArray(body.ips) ? body.ips.map(String).map(s=>s.trim()).filter(Boolean) : [];
    if (ips.length === 0) {
      return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Try to fulfill from cache first (KV)
    const toFetch = [];
    const results = [];
    for (const ip of ips) {
      const cached = await env.KV.get(`geo:${ip}`);
      if (cached) {
        try { results.push(JSON.parse(cached)); } catch { results.push({ query: ip }); }
      } else {
        toFetch.push(ip);
      }
    }

    // Fetch remaining from ip-api.com in batches of up to 100
    while (toFetch.length) {
      const batch = toFetch.splice(0, 100);
      const payload = batch.map(ip => ({ query: ip }));
      const r = await fetch('http://ip-api.com/batch?fields=status,country,countryCode,city,isp,query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        const arr = await r.json();
        for (const item of arr) {
          const norm = {
            query: item.query,
            status: item.status,
            country: item.country || '',
            countryCode: item.countryCode || '',
            city: item.city || '',
            isp: item.isp || ''
          };
          results.push(norm);
          // Cache for 24 hours
          try { await env.KV.put(`geo:${norm.query}`, JSON.stringify(norm), { expirationTtl: 86400 }); } catch {}
        }
      } else {
        // If external API fails, still push minimal entries for the batch
        for (const ip of batch) results.push({ query: ip, status: 'fail' });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
