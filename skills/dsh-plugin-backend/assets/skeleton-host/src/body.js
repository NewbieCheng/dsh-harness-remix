// Reject over-limit and aborted requests even if the retained prefix is valid JSON.
export function readJsonBody(request, limit = 16 * 1024) {
  return new Promise((resolve) => {
    const chunks = []
    let bytes = 0
    let invalid = false
    request.on('data', (chunk) => {
      bytes += chunk.length
      if (bytes > limit) { invalid = true; chunks.length = 0; return }
      if (!invalid) chunks.push(chunk)
    })
    request.on('end', () => {
      if (invalid) { resolve(null); return }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null)
      } catch { resolve(null) }
    })
    request.on('aborted', () => resolve(null))
    request.on('error', () => resolve(null))
  })
}
