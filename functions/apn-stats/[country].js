export const onRequestGet = async ({ params, env }) => {
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

  const rawCountry = params.country;
  const country = normalizeCountryName(rawCountry);
  if (!country) return new Response('Not found', { status: 404 });

  // APN list and busy counters
  const listRaw = await env.KV.get(`apn_list:${country}`);
  const all = listRaw ? JSON.parse(listRaw) : [];
  const busyRaw = await env.KV.get(`apn_busy:${country}`);
  const busyMap = busyRaw ? JSON.parse(busyRaw) : {};

  // Each APN has capacity 3
  const totalSlots = all.length * 3;
  let usedSlots = 0;
  for (const d of all) {
    usedSlots += Math.min(3, Number(busyMap[String(d).toLowerCase()] || 0));
  }
  const freeSlots = totalSlots - usedSlots;

  return new Response(
    JSON.stringify({ total: totalSlots, free: freeSlots, busy: usedSlots }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
