// Admin authorization helper function
// This function checks if a session belongs to an authorized admin user

export async function verifyAdminSession(request, env) {
  try {
    // Extract session from multiple sources
    const auth = request.headers.get('authorization') || '';
    const url = new URL(request.url);
    let session = '';
    
    if (auth.toLowerCase().startsWith('bearer ')) {
      session = auth.slice(7).trim();
    } else {
      // Try to get from request body if it's a POST request
      try {
        const body = await request.clone().json();
        session = body.session || url.searchParams.get('session') || '';
      } catch {
        session = url.searchParams.get('session') || '';
      }
    }

    if (!session) {
      return { 
        success: false, 
        error: 'No session provided', 
        status: 401,
        message: 'Unauthorized: لطفاً در بخش بالا با OTP وارد شوید (Admin session).'
      };
    }

    // Get chat_id from session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return { 
        success: false, 
        error: 'Invalid session', 
        status: 401,
        message: 'Unauthorized: لطفاً در بخش بالا با OTP وارد شوید (Admin session).'
      };
    }

    // Check if user is verified
    const verified = await env.KV.get(`user:${chat_id}:verified`);
    if (!verified) {
      return { 
        success: false, 
        error: 'User not verified', 
        status: 403,
        message: 'Forbidden: کاربر تایید نشده است.'
      };
    }

    // Check if user is in admin list (you can customize this logic)
    const adminChatIds = (env.ADMIN_CHAT_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
    
    // If no admin list is configured, allow any verified user (backward compatibility)
    // In production, you should always configure ADMIN_CHAT_IDS
    if (adminChatIds.length > 0 && !adminChatIds.includes(chat_id)) {
      return { 
        success: false, 
        error: 'Not authorized as admin', 
        status: 403,
        message: 'Forbidden: شما مجوز دسترسی به پنل ادمین را ندارید.'
      };
    }

    // Extend session TTL on successful admin access
    try {
      await env.KV.put(`session:${session}`, chat_id, { expirationTtl: 2592000 }); // 30 days
    } catch (_) { /* ignore refresh errors */ }

    return { 
      success: true, 
      chat_id, 
      session 
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Server error', 
      status: 500,
      message: 'خطای سرور رخ داده است.'
    };
  }
}

// Helper function to create error response
export function createAdminErrorResponse(authResult) {
  return new Response(JSON.stringify({ 
    error: authResult.error,
    message: authResult.message 
  }), { 
    status: authResult.status,
    headers: { 'Content-Type': 'application/json' } 
  });
}
