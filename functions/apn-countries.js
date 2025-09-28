export const onRequestGet = async ({ env }) => {
  try {
    // Load all countries stored in DB
    const list = await env.DB.list();
    const countries = await Promise.all(
      list.keys.map(async (k) => {
        try {
          const c = await env.DB.get(k.name, { type: 'json' });
          if (!c || !c.name) return null;
          const key = String(c.name).trim().toLowerCase();
          const apnRaw = await env.KV.get(`apn_list:${key}`);
          const apn = apnRaw ? JSON.parse(apnRaw) : [];
          // Only include countries that have at least one APN domain
          if (Array.isArray(apn) && apn.length > 0) {
            return { name: c.name, code: c.code, faName: c.faName };
          }
        } catch (_) {}
        return null;
      })
    );

    const filtered = countries.filter(Boolean);
    return new Response(JSON.stringify(filtered), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
