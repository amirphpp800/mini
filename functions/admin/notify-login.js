export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session } = body || {};
    if (!session) return new Response('Invalid input', { status: 400 });

    const admin_chat = await env.KV.get(`session:${session}`);
    if (!admin_chat) return new Response('Unauthorized', { status: 401 });

    const token = env.BOT_TOKEN;
    const owner = '7240662021';
    if (token && owner) {
      const text = `ورود ادمین به پنل\nchat_id: ${admin_chat}`;
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: owner, text })
        });
      } catch (_) {}
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
