export async function api(
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = text || null
  }

  return { status: res.status, body: parsed, headers: res.headers }
}

/**
 * Send a raw request with explicit content-type (for testing 415 etc.)
 */
export async function rawFetch(
  baseUrl: string,
  method: string,
  path: string,
  rawBody: string,
  contentType: string,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": contentType },
    body: rawBody,
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = text || null
  }

  return { status: res.status, body: parsed, headers: res.headers }
}
