export const onRequestGet = async ({ params, env }) => {
  const country = params.country?.toLowerCase();
  if (!country) return new Response('Not found', { status: 404 });

  const allRaw = await env.KV.get(`wg_ips:${country}`);
  const all = allRaw ? JSON.parse(allRaw) : [];

  const busyRaw = await env.KV.get(`wg_busy:${country}`);
  const busy = busyRaw ? JSON.parse(busyRaw) : [];

  const total = all.length;
  const busyCount = busy.length;
  const freeCount = total - busyCount;

  return new Response(
    JSON.stringify({ total, free: freeCount, busy: busyCount }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
