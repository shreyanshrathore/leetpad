/**
 * Extract the LeetCode problem slug from a URL.
 * Example: https://leetcode.com/problems/two-sum/ -> "two-sum"
 */
export function extractProblemSlug(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/problems\/([^/]+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * Read problem slug from hosted app query string.
 * Example: ?problem=two-sum
 */
export function extractProblemSlugFromQuery(): string | null {
  const params = new URLSearchParams(window.location.search)
  const problem = params.get('problem')?.trim()
  return problem || null
}
