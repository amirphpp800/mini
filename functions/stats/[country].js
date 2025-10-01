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
  if (!country) {
    return new Response('Not found', { status: 404 });
  }

  // All IPs list
  const allRaw = await env.KV.get(`ips:${country}`);
  const all = allRaw ? JSON.parse(allRaw) : [];

  // Busy list (optional, may not exist yet)
  const busyRaw = await env.KV.get(`ips_busy:${country}`);
  const busy = busyRaw ? JSON.parse(busyRaw) : [];

  const total = all.length;
  const busyCount = busy.length;
  const freeCount = total - busyCount;

  return new Response(
    JSON.stringify({ total, free: freeCount, busy: busyCount }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
