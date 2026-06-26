/**
 * Turn a LeetCode slug into a readable title.
 * Example: two-sum -> Two Sum
 */
export function formatProblemTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getLeetCodeProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`
}
