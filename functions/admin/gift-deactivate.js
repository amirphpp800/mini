import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

/**
 * Admin Gift Code Deactivate - Set max_uses to current used to deactivate
 * POST /admin/gift-deactivate
 */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Verify admin authorization
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body.code || '').trim();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read gift by unified key
    const giftKey = `gift:${code}`;
    const raw = await env.KV.get(giftKey);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Gift code not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gift = JSON.parse(raw);
    const used = Number(gift.used || 0);
    const updated = {
      ...gift,
      max_uses: Math.max(used, 1),
      deactivated_at: new Date().toISOString(),
      deactivated_by: authResult.chat_id || 'admin'
    };

    await env.KV.put(giftKey, JSON.stringify(updated));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
