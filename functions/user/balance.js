export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = request.headers.get('authorization') || '';
    let session = '';
    if (auth.toLowerCase().startsWith('bearer ')) session = auth.slice(7).trim();
    else {
      const url = new URL(request.url);
      session = url.searchParams.get('session') || '';
    }
    if (!session) return new Response('Unauthorized', { status: 401 });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response('Unauthorized', { status: 401 });

    const key = `balance:${chat_id}`;
    const raw = await env.KV.get(key);
    const balance = raw ? parseFloat(raw) : 0;
    return new Response(JSON.stringify({ chat_id, balance: Number.isFinite(balance) ? balance.toFixed(2) : '0.00' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
