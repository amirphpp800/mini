import { verifyAdminSession, createAdminErrorResponse } from '../_admin-auth.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminSession(request, env);
    if (!authResult.success) {
      return createAdminErrorResponse(authResult);
    }

    // Helper function to normalize country names
    function normalizeCountryName(country) {
      const normalized = String(country || '').toLowerCase().trim();
      // Normalize England, UK, United Kingdom, Great Britain, GB to england
      if (normalized === 'england' || normalized === 'uk' || normalized === 'united kingdom' || 
          normalized === 'great britain' || normalized === 'gb' || normalized === 'انگلیس') {
        return 'england';
      }
      // Normalize America, USA, United States to a single name
      if (normalized === 'america' || normalized === 'usa' || normalized === 'united states' || normalized === 'united states of america') {
        return 'united states';
      }
      // Return normalized lowercase country name
      return normalized;
    }

    const body = await request.json();
    const { country: rawCountry } = body || {};
    const country = normalizeCountryName(rawCountry);
    
    if (!country) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const key = String(country).trim().toLowerCase();
    if (!key) {
      return new Response(JSON.stringify({ error: 'invalid_country' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Delete country record and all related data
    try {
      await Promise.all([
        // Delete from DB
        env.DB.delete(key),
        // Delete DNS-related keys
        env.KV.delete(`ips:${key}`),
        env.KV.delete(`ips_busy:${key}`),
        env.KV.delete(`stats:${key}`),
        // Delete WireGuard-related keys
        env.KV.delete(`wg_ips:${key}`),
        env.KV.delete(`wg_busy:${key}`),
        // Delete APN-related keys
        env.KV.delete(`apn_list:${key}`),
        env.KV.delete(`apn_busy:${key}`)
      ]);
    } catch (deleteError) {
      // Continue even if some deletions fail
      console.error('Some deletions failed:', deleteError);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
