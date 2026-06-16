import { useEffect, useState } from 'react'
import {
  extractProblemSlug,
  extractProblemSlugFromQuery,
} from '../lib/problemSlug'

function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.tabs?.query)
}

async function getActiveTabUrl(): Promise<string | null> {
  if (!isExtensionContext()) return null

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]?.url ?? null)
    })
  })
}

/**
 * Detect the current LeetCode problem slug.
 * - Extension: read active tab URL
 * - Hosted iPad page: read ?problem= query param
 */
export function useProblemSlug() {
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [manualSlug, setManualSlug] = useState('')

  useEffect(() => {
    let cancelled = false

    async function detectSlug() {
      setLoading(true)

      const querySlug = extractProblemSlugFromQuery()
      if (querySlug) {
        if (!cancelled) {
          setSlug(querySlug)
          setLoading(false)
        }
        return
      }

      const tabUrl = await getActiveTabUrl()
      const tabSlug = tabUrl ? extractProblemSlug(tabUrl) : null

      if (!cancelled) {
        setSlug(tabSlug)
        setLoading(false)
      }
    }

    detectSlug()

    if (isExtensionContext()) {
      const onTabUpdated = (
        _tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo,
        tab: chrome.tabs.Tab,
      ) => {
        if (changeInfo.url || changeInfo.status === 'complete') {
          const nextSlug = tab.url ? extractProblemSlug(tab.url) : null
          setSlug(nextSlug)
        }
      }

      chrome.tabs.onUpdated.addListener(onTabUpdated)
      return () => {
        cancelled = true
        chrome.tabs.onUpdated.removeListener(onTabUpdated)
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  const effectiveSlug = slug ?? (manualSlug.trim() || null)

  return {
    slug: effectiveSlug,
    loading,
    needsManualInput: !loading && !slug,
    manualSlug,
    setManualSlug,
  }
}
