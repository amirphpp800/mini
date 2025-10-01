export const onRequestGet = async ({ request, env }) => {
  try {
    // Read session from Authorization: Bearer <token> or from ?session= query param
    const auth = request.headers.get('authorization') || '';
    let session = '';
    if (auth.toLowerCase().startsWith('bearer ')) {
      session = auth.slice(7).trim();
    } else {
      const url = new URL(request.url);
      session = url.searchParams.get('session') || '';
    }
    if (!session) return new Response('Unauthorized', { status: 401 });

    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) return new Response('Unauthorized', { status: 401 });

    // Check if user has password set
    const pwdRecord = await env.KV.get(`user:pwd:${chat_id}`);
    const hasPassword = !!pwdRecord;

    return new Response(JSON.stringify({ 
      chat_id, 
      hasPassword 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
