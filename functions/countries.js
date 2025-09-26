export const onRequestGet = async ({ env }) => {
  const list = await env.DB.list();
  let countries = await Promise.all(
    list.keys.map((k) => env.DB.get(k.name, { type: 'json' }))
  );

  // If KV is empty, add a default country (England) with high-quality flag image
  if (countries.length === 0) {
    countries = [
      {
        name: 'England',
        code: 'gb-eng',
        faName: 'انگلیس',
        description: 'Default country card added automatically.'
      }
    ];
  }
  return new Response(JSON.stringify(countries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
