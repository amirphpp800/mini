import { json, readJSON } from '../_utils/auth.js';
import { kvSet, kvExpire, randomCode } from '../_utils/kv.js';
import { sendTelegramCode } from '../_utils/telegram.js';

export async function onRequestPost({ request, env }){
  const { telegramId } = await readJSON(request);
  if(!telegramId) return json({ error:'invalid' }, 400);
  const code = randomCode();
  await kvSet(env, `app:verification:${telegramId}`, code);
  await kvExpire(env, `app:verification:${telegramId}`, 600); // 10 minutes
  try {
    await sendTelegramCode(env, telegramId, code);
  } catch(e){
    return json({ error:'telegram', detail: String(e) }, 500);
  }
  return json({ ok:true });
}
