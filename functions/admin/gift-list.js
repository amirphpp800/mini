import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

/**
 * Admin Gift Code List - Fetch all gift codes with their status
 * GET /admin/gift-list
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    // Verify admin authorization (supports Authorization header, body.session, or ?session=)
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    // Get all gift codes from KV using unified schema: gift:<CODE>
    const giftCodes = [];
    const listResult = await env.KV.list({ prefix: 'gift:' });
    
    for (const key of listResult.keys) {
      try {
        const val = await env.KV.get(key.name);
        if (!val) continue;
        const parsed = JSON.parse(val);
        const code = key.name.replace('gift:', '');
        
        giftCodes.push({
          code,
          amount: Number(parsed.amount || 0),
          max_uses: Number(parsed.max_uses || 0),
          per_user_once: !!parsed.per_user_once,
          used_count: Number(parsed.used || 0),
          created_at: parsed.created_at || key.metadata?.created_at || null
        });
      } catch (e) {
        // skip malformed entries
      }
    }

    return new Response(JSON.stringify({
      success: true,
      codes: giftCodes,
      total: giftCodes.length
    }), {
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
