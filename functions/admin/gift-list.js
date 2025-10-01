/**
 * Admin Gift Code List - Fetch all gift codes with their status
 * GET /admin/gift-list
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    // Check if this is an admin session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = authHeader.substring(7);
    
    // Verify admin session
    const adminData = await env.KV.get(`admin_session:${session}`);
    if (!adminData) {
      return new Response(JSON.stringify({ error: 'Invalid admin session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all gift codes from KV
    const giftCodes = [];
    
    // List all keys with gift_code: prefix
    const listResult = await env.KV.list({ prefix: 'gift_code:' });
    
    for (const key of listResult.keys) {
      try {
        const codeData = await env.KV.get(key.name);
        if (codeData) {
          const parsed = JSON.parse(codeData);
          
          // Extract code from key name
          const code = key.name.replace('gift_code:', '');
          
          // Get usage count
          const usageKey = `gift_usage:${code}`;
          const usageData = await env.KV.get(usageKey);
          const usageInfo = usageData ? JSON.parse(usageData) : { count: 0, users: [] };
          
          giftCodes.push({
            code: code,
            amount: parsed.amount || 0,
            max_uses: parsed.max_uses || 0,
            per_user_once: parsed.per_user_once || false,
            used_count: usageInfo.count || 0,
            created_at: parsed.created_at || key.metadata?.created_at || null
          });
        }
      } catch (e) {
        console.error(`Error processing gift code ${key.name}:`, e);
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
    console.error('Gift list error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
