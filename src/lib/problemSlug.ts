/**
 * Extract the LeetCode problem slug from a URL.
 * Example: https://leetcode.com/problems/two-sum/ -> "two-sum"
 */
export function extractProblemSlug(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/problems\/([^/]+)/)
    const raw = match?.[1]
    return raw ? normalizeProblemSlug(raw) : null
  } catch {
    return null
  }
}

/**
 * Normalize user input into a LeetCode problem slug (lowercase, hyphenated).
 * Example: "Two Sum" / "TWO-SUM" -> "two-sum"
 */
export function normalizeProblemSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
}

/**
 * Read problem slug from hosted app query string.
 * Example: ?problem=two-sum
 */
export function extractProblemSlugFromQuery(): string | null {
  const params = new URLSearchParams(window.location.search)
  const problem = params.get('problem')
  if (!problem?.trim()) return null
  return normalizeProblemSlug(problem)
}
