export const onRequestGet = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const session = url.searchParams.get('session') || '';
    if (!session) return new Response('Unauthorized', { status: 401 });
    const admin_chat = await env.KV.get(`session:${session}`);
    if (!admin_chat) return new Response('Unauthorized', { status: 401 });

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

export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, dns, wg } = body || {};
    if (!session) return new Response('Unauthorized', { status: 401 });
    const admin_chat = await env.KV.get(`session:${session}`);
    if (!admin_chat) return new Response('Unauthorized', { status: 401 });

    let updated = {};
    if (typeof dns === 'number' && Number.isFinite(dns) && dns >= 0) {
      await env.KV.put('pricing:dns', String(+dns.toFixed(2)));
      updated.dns = +dns.toFixed(2);
    }
    if (typeof wg === 'number' && Number.isFinite(wg) && wg >= 0) {
      await env.KV.put('pricing:wg', String(+wg.toFixed(2)));
      updated.wg = +wg.toFixed(2);
    }

    const dnsRaw = await env.KV.get('pricing:dns');
    const wgRaw = await env.KV.get('pricing:wg');
    const outDns = Number.isFinite(parseFloat(dnsRaw)) ? parseFloat(dnsRaw) : 0.5;
    const outWg = Number.isFinite(parseFloat(wgRaw)) ? parseFloat(wgRaw) : 1.0;

    // Optional notify owner
    const token = env.BOT_TOKEN;
    const owner = '7240662021';
    if (token && owner && (updated.dns !== undefined || updated.wg !== undefined)) {
      const lines = [
        'اعلان تغییر قیمت',
        `ادمین ${admin_chat} قیمت‌ها را تغییر داد:`,
      ];
      if (updated.dns !== undefined) lines.push(`DNS: ${updated.dns.toFixed(2)}$`);
      if (updated.wg !== undefined) lines.push(`WG: ${updated.wg.toFixed(2)}$`);
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: owner, text: lines.join('\n') })
        });
      } catch (_) {}
    }

    return new Response(JSON.stringify({ ok: true, dns: +outDns.toFixed(2), wg: +outWg.toFixed(2) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
