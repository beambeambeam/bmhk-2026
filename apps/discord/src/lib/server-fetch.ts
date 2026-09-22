import { env } from "@bmhk-2026/env/discord";

export async function serverFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(path, env.SERVER_BASE_URL);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers)),
      "content-type": "application/json",
      "x-api-key": env.SERVER_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Request to ${url.pathname} failed with status ${response.status}`);
  }

  return response;
}
