// Use env token if available; otherwise fallback to the embedded token provided by the owner.
// Note: Embedding tokens in code is not recommended for production. Prefer environment variables.
export function getTelegramToken(env){
  const envToken = env?.TELEGRAM_BOT_TOKEN && String(env.TELEGRAM_BOT_TOKEN).trim();
  const FALLBACK_BOT_TOKEN = '8295072147:AAHglebZU4ynaG60DMwrSEbrCgGUuZoUchQ';
  return envToken || FALLBACK_BOT_TOKEN;
}

export async function sendTelegramCode(env, telegramId, code){
  const token = getTelegramToken(env);
  if(!token){
    throw new Error('TELEGRAM_BOT_TOKEN not set and no fallback provided');
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = { chat_id: telegramId, text: `کد تایید شما: ${code}` };
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  // Telegram may return HTTP 200 with ok=false, so we must inspect JSON
  let data;
  try { data = await res.json(); } catch { data = null; }
  if(!res.ok || (data && data.ok === false)){
    const desc = data?.description || await res.text();
    throw new Error(desc || 'telegram send failed');
  }
  return data;
}
