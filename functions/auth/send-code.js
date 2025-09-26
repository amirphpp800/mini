export const onRequestPost = async ({ request, env }) => {
  try {
    const { chat_id } = await request.json();
    if (!chat_id) {
      return new Response('chat_id required', { status: 400 });
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in KV with 5-minute TTL
    await env.KV.put(`otp:${chat_id}`, code, { expirationTtl: 300 });

    const token = env.BOT_TOKEN || '8295072147:AAHglebZU4ynaG60DMwrSEbrCgGUuZoUchQ';

    // Send code via Telegram Bot API
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text: `Your verification code: ${code}`,
      }),
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    return new Response('Error', { status: 500 });
  }
};
