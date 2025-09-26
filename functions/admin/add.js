export const onRequestPost = async ({ request, env }) => {
  const body = await request.json();
  const { name, code } = body || {};
  if (!name || !code) {
    return new Response('Invalid', { status: 400 });
  }
  const iso = String(code).trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(iso)) {
    return new Response('Invalid code', { status: 400 });
  }
  const rec = { name, code: iso };
  await env.DB.put(name.toLowerCase(), JSON.stringify(rec));
  return new Response('Stored', { status: 200 });
};
