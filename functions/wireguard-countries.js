export const onRequestGet = async ({ env }) => {
  try {
    // Load all countries stored in DB (created via DNS or WG admin APIs)
    const list = await env.DB.list();
    const countries = await Promise.all(
      list.keys.map(async (k) => {
        const c = await env.DB.get(k.name, { type: 'json' });
        if (!c || !c.name) return null;
        const key = String(c.name).trim().toLowerCase();
        try {
          const wgRaw = await env.KV.get(`wg_ips:${key}`);
          const wg = wgRaw ? JSON.parse(wgRaw) : [];
          // Only include countries that have at least one WG endpoint
          if (Array.isArray(wg) && wg.length > 0) {
            return { name: c.name, code: c.code, faName: c.faName };
          }
        } catch (_) {}
        return null;
      })
    );

    const filtered = countries.filter(Boolean);

    // If none exist yet, fall back to an empty array so UI can fall back to static JSON if needed
    return new Response(JSON.stringify(filtered), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
