// Fetches a URL with a timeout. On failure returns null so callers can show fallback UI.
export async function fetchWithFallback(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(id)
    if (!res.ok) return null
    return await res.json()
  } catch {
    clearTimeout(id)
    return null
  }
}
