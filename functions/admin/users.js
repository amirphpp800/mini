import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    const admin_chat = authResult.chat_id;

    // Build users list by merging balances and verified flags
    const usersMap = new Map();

    // List balances
    try {
      const balList = await env.KV.list({ prefix: 'balance:' });
      for (const { name, metadata } of balList.keys) {
        const chat_id = name.slice('balance:'.length);
        const raw = await env.KV.get(name);
        const bal = raw ? parseFloat(raw) : 0;
        const balance = Number.isFinite(bal) ? +bal.toFixed(2) : 0;
        const rec = usersMap.get(chat_id) || { chat_id, balance: 0, verified: false };
        rec.balance = balance;
        usersMap.set(chat_id, rec);
      }
    } catch (_) {}

    // List verified
    try {
      const verList = await env.KV.list({ prefix: 'user:' });
      for (const { name } of verList.keys) {
        // expecting format user:<chat_id>:verified
        if (!name.endsWith(':verified')) continue;
        const parts = name.split(':');
        if (parts.length >= 3) {
          const chat_id = parts[1];
          const rec = usersMap.get(chat_id) || { chat_id, balance: 0, verified: false };
          rec.verified = true;
          usersMap.set(chat_id, rec);
        }
      }
    } catch (_) {}

    // Also, include any active sessions as implicit verified users
    try {
      const sesList = await env.KV.list({ prefix: 'session:' });
      for (const { name } of sesList.keys) {
        const chat_id = await env.KV.get(name);
        if (!chat_id) continue;
        const rec = usersMap.get(chat_id) || { chat_id, balance: 0, verified: false };
        rec.verified = rec.verified || true;
        usersMap.set(chat_id, rec);
      }
    } catch (_) {}

    const users = Array.from(usersMap.values())
      .filter(u => !!u.chat_id)
      .sort((a, b) => b.balance - a.balance || String(a.chat_id).localeCompare(String(b.chat_id)));

    const total_balance = users.reduce((acc, u) => acc + (Number.isFinite(u.balance) ? u.balance : 0), 0);

    return new Response(JSON.stringify({
      ok: true,
      total: users.length,
      total_balance: +total_balance.toFixed(2),
      users
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
