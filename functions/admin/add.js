export const onRequestPost = async ({ request, env }) => {
  const body = await request.json();
  if (!body.name || !body.flag) {
    return new Response('Invalid', { status: 400 });
  }
  await env.DB.put(body.name.toLowerCase(), JSON.stringify(body));
  return new Response('Stored', { status: 200 });
};
