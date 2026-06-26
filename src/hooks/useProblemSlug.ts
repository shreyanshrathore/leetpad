import { useCallback, useEffect, useState } from 'react'
import {
  extractProblemSlug,
  extractProblemSlugFromQuery,
} from '../lib/problemSlug'
import {
  isContentScriptContext,
  isExtensionPageContext,
  isHostedWebApp,
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

function readHostedSlug(): string | null {
  return extractProblemSlugFromQuery()
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

  const navigateToProblem = useCallback((nextSlug: string) => {
    const trimmed = nextSlug.trim()
    if (!trimmed) return

    if (isHostedWebApp()) {
      const url = new URL(window.location.href)
      url.searchParams.set('problem', trimmed)
      window.history.pushState({}, '', url.toString())
      setSlug(trimmed)
      return
    }

    setSlug(trimmed)
    const url = new URL(window.location.href)
    url.searchParams.set('problem', trimmed)
    window.history.replaceState({}, '', url.toString())
  }, [])

  useEffect(() => {
    let cancelled = false

    async function detectSlug() {
      setLoading(true)

      const querySlug = readHostedSlug()
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

    if (isHostedWebApp()) {
      const onPopState = () => {
        setSlug(readHostedSlug())
      }

      window.addEventListener('popstate', onPopState)
      return () => {
        cancelled = true
        window.removeEventListener('popstate', onPopState)
      }
    }

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
    navigateToProblem(manualSlug)
  }

  return {
    slug,
    loading,
    needsManualInput: !loading && !slug && !isHostedWebApp(),
    manualSlug,
    setManualSlug,
    commitManualSlug,
    navigateToProblem,
  }
}
