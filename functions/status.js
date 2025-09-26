export const onRequestGet = async ({ env }) => {
  let kv = false;
  let db = false;
  try {
    await env.KV.list({ limit: 1 });
    kv = true;
  } catch {}
  try {
    await env.DB.list({ limit: 1 });
    db = true;
  } catch {}
  const bot = !!env.BOT_TOKEN;
  return new Response(JSON.stringify({ kv, db, bot }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
