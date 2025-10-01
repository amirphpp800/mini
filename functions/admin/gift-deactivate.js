/**
 * Admin Gift Code Deactivate - Deactivate a gift code by setting max_uses to current usage
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
    const body = await request.json();
    const { session, code } = body;

    if (!session || !code) {
      return new Response(JSON.stringify({ error: 'Missing session or code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin session
    const adminData = await env.KV.get(`admin_session:${session}`);
    if (!adminData) {
      return new Response(JSON.stringify({ error: 'Invalid admin session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if gift code exists
    const giftKey = `gift_code:${code}`;
    const giftData = await env.KV.get(giftKey);
    
    if (!giftData) {
      return new Response(JSON.stringify({ error: 'Gift code not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const giftInfo = JSON.parse(giftData);
    
    // Get current usage count
    const usageKey = `gift_usage:${code}`;
    const usageData = await env.KV.get(usageKey);
    const usageInfo = usageData ? JSON.parse(usageData) : { count: 0, users: [] };
    
    // Set max_uses to current usage count to deactivate
    const updatedGift = {
      ...giftInfo,
      max_uses: Math.max(usageInfo.count, 1), // Ensure at least 1 to mark as used up
      deactivated_at: new Date().toISOString(),
      deactivated_by: 'admin'
    };

    // Update the gift code
    await env.KV.put(giftKey, JSON.stringify(updatedGift));

    return new Response(JSON.stringify({
      success: true,
      message: 'Gift code deactivated successfully',
      code: code,
      previous_max_uses: giftInfo.max_uses || 0,
      new_max_uses: updatedGift.max_uses,
      current_usage: usageInfo.count
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Gift deactivate error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
