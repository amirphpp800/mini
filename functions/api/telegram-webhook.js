import { json, readJSON } from '../_utils/auth.js';

// Minimal Telegram webhook endpoint
// Receives updates and optionally responds to /start
export async function onRequestPost({ request, env }){
  try {
    const update = await readJSON(request);
    const token = env.TELEGRAM_BOT_TOKEN;
    if(!token){
      // We still return 200 so Telegram doesn't retry endlessly
      return json({ ok:true, note: 'TELEGRAM_BOT_TOKEN not set' });
    }

    // Handle message updates
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    const text = msg?.text || '';

    if(chatId && typeof text === 'string'){
      if(text.trim().startsWith('/start')){
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: 'سلام! وبهوک با موفقیت فعال است.' })
        });
      }
    }

    return json({ ok:true });
  } catch (e){
    // Always return 200 to avoid Telegram retry storms, but log error detail in response
    return json({ ok:true, error: String(e) });
  }
}
