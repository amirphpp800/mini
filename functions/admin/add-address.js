export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { session, country, flag, description, addresses } = body;

    if (!session || !addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return new Response('Invalid input', { status: 400 });
    }

    // Verify session
    const chat_id = await env.KV.get(`session:${session}`);
    if (!chat_id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const key = country.toLowerCase();
    let countryData = await env.DB.get(key, { type: 'json' });

    // If country doesn't exist, create it (flag required)
    if (!countryData) {
      if (!flag) return new Response('Flag required for new country', { status: 400 });
      countryData = { name: country, flag, description: description || '' };
      await env.DB.put(key, JSON.stringify(countryData));
    }

    // Store addresses list in a separate KV namespace
    const addrKey = `ips:${key}`;
    let stored = await env.KV.get(addrKey);
    let list = stored ? JSON.parse(stored) : [];

    addresses.forEach((ip) => {
      if (!list.includes(ip)) list.push(ip);
    });

    await env.KV.put(addrKey, JSON.stringify(list));

    return new Response('Addresses added', { status: 200 });
  } catch (err) {
    return new Response('Error', { status: 500 });
  }
};
