export const onRequestGet = async ({ env }) => {
  try {
    const dnsRaw = await env.KV.get('pricing:dns');
    const wgRaw = await env.KV.get('pricing:wg');
    const dns = Number.isFinite(parseFloat(dnsRaw)) ? parseFloat(dnsRaw) : 0.5;
    const wg = Number.isFinite(parseFloat(wgRaw)) ? parseFloat(wgRaw) : 1.0;
    return new Response(JSON.stringify({ dns: +dns.toFixed(2), wg: +wg.toFixed(2) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
