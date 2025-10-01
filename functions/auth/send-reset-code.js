export const onRequestPost = async ({ request, env }) => {
  try {
    const { chat_id } = await request.json();
    if (!chat_id) return new Response('chat_id required', { status: 400 });

    // 30s rate limit per chat_id for reset
    const now = Date.now();
    const lastStr = await env.KV.get(`otp:last:reset:${chat_id}`);
    if (lastStr) {
      const last = parseInt(lastStr, 10) || 0;
      const diff = Math.floor((now - last) / 1000);
      const wait = 30 - diff;
      if (wait > 0) {
        return new Response(JSON.stringify({ error: 'rate_limited', next_retry_sec: wait }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate 5-digit numeric OTP for reset
    const code = Math.floor(10000 + Math.random() * 90000).toString();

    // Store OTP in KV with 5-minute TTL
    await env.KV.put(`otp:reset:${chat_id}`, code, { expirationTtl: 300 });
    await env.KV.put(`otp:last:reset:${chat_id}`, String(now));

    const token = env.BOT_TOKEN;
    if (!token) return new Response('Bot token missing', { status: 500 });

    const text = [
      'درخواست تغییر رمز عبور',
      '',
      `کد تایید شما: ${code}`,
      '',
      'اگر پیام دریافت نکردید، ابتدا به ربات زیر پیام دهید (Start بزنید) و سپس دوباره تلاش کنید:',
      '@minidnsverify_bot'
    ].join('\n');

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text })
    });
    if (!tgRes.ok) return new Response('Failed to send telegram message', { status: 502 });

    return new Response(JSON.stringify({ ok: true, next_retry_sec: 30 }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
