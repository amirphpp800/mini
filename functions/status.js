export const onRequestGet = async ({ env }) => {
  let kv = false;
  try {
    await env.KV.list({ limit: 1 });
    kv = true;
  } catch {}
  const bot = !!env.BOT_TOKEN;
  return new Response(JSON.stringify({ kv, bot }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
