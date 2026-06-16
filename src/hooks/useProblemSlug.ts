import { useEffect, useState } from 'react'
import {
  extractProblemSlug,
  extractProblemSlugFromQuery,
} from '../lib/problemSlug'
import {
  isContentScriptContext,
  isExtensionPageContext,
} from '../lib/runtimeContext'

function isSidePanelContext(): boolean {
  return isExtensionPageContext() && Boolean(chrome.tabs?.query)
}

async function getActiveTabUrl(): Promise<string | null> {
  if (!isSidePanelContext()) return null

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

      if (isContentScriptContext()) {
        const pageSlug = extractProblemSlug(window.location.href)
        if (!cancelled) {
          setSlug(pageSlug)
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

    if (isSidePanelContext()) {
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

    if (isContentScriptContext()) {
      const onUrlChange = () => {
        setSlug(extractProblemSlug(window.location.href))
      }

      window.addEventListener('popstate', onUrlChange)
      const observer = new MutationObserver(onUrlChange)
      observer.observe(document.documentElement, { childList: true, subtree: true })

      return () => {
        cancelled = true
        window.removeEventListener('popstate', onUrlChange)
        observer.disconnect()
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  function commitManualSlug() {
    const trimmed = manualSlug.trim()
    if (!trimmed) return

    setSlug(trimmed)

    const url = new URL(window.location.href)
    url.searchParams.set('problem', trimmed)
    window.history.replaceState({}, '', url.toString())
  }

  return {
    slug,
    loading,
    needsManualInput: !loading && !slug,
    manualSlug,
    setManualSlug,
    commitManualSlug,
  }
}
