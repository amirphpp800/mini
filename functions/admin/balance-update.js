export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, target_chat_id, delta } = body || {};
    if (!session || !target_chat_id || typeof delta !== 'number') {
      return new Response('Invalid input', { status: 400 });
    }

    // verify admin session
    const admin_chat = await env.KV.get(`session:${session}`);
    if (!admin_chat) return new Response('Unauthorized', { status: 401 });

    // Update balance
    const key = `balance:${target_chat_id}`;
    const raw = await env.KV.get(key);
    const current = raw ? parseFloat(raw) : 0;
    const prev = Number.isFinite(current) ? current : 0;
    const next = +(prev + delta).toFixed(2);
    await env.KV.put(key, String(next));

    // Notify owner via Telegram
    const token = env.BOT_TOKEN;
    const owner = '7240662021';
    if (token && owner) {
      const text = [
        'اعلان مدیریت موجودی',
        `ادمین با chat_id=${admin_chat} موجودی کاربر ${target_chat_id} را تغییر داد`,
        `تغییر: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}$`,
        `موجودی قبلی: ${prev.toFixed(2)}$`,
        `موجودی جدید: ${next.toFixed(2)}$`
      ].join('\n');
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: owner, text })
        });
      } catch (_) { /* ignore notify errors */ }
    }

    return new Response(JSON.stringify({ ok: true, prev: prev.toFixed(2), next: next.toFixed(2) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
