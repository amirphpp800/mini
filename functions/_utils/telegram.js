export async function sendTelegramCode(env, telegramId, code){
  const token = env.TELEGRAM_BOT_TOKEN;
  if(!token){
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = { chat_id: telegramId, text: `کد تایید شما: ${code}` };
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){ throw new Error(await res.text()); }
  return res.json();
}
