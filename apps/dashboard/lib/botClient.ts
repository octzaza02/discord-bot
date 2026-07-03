export async function callBot(pathName: string, init: RequestInit = {}) {
  const base = process.env.BOT_INTERNAL_URL!;
  const secret = process.env.INTERNAL_API_SECRET!;
  const res = await fetch(`${base}${pathName}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json?.error ?? `bot ${res.status}`);
  return json;
}
