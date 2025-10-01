import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    const body = await request.json();
    const { target_chat_id, delta } = body || {};
    
    if (!target_chat_id || typeof delta !== 'number') {
      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const admin_chat = authResult.chat_id;

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
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
