import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    const body = await request.json().catch(() => ({}));
    const { code, amount, per_user_once = true, max_uses = 0 } = body || {};

    // Basic validations
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return new Response(JSON.stringify({ error: 'invalid_amount', message: 'Amount must be a positive number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    let uses = parseInt(max_uses, 10);
    if (!Number.isFinite(uses) || uses < 0) uses = 0; // 0 => unlimited

    // Normalize or generate code
    let raw = (code || '').trim();
    if (!raw) {
      raw = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4);
    }
    const norm = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!norm || norm.length < 4) {
      return new Response(JSON.stringify({ error: 'invalid_code', message: 'Code must be alphanumeric and length >= 4' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const key = `gift:${norm}`;
    const exists = await env.KV.get(key);
    if (exists) {
      return new Response(JSON.stringify({ error: 'exists', message: 'Gift code already exists' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = {
      code: norm,
      amount: +amt.toFixed(2),
      per_user_once: !!per_user_once,
      max_uses: uses, // 0 => unlimited
      used: 0
    };

    await env.KV.put(key, JSON.stringify(payload));

    return new Response(JSON.stringify({ ok: true, gift: payload }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
