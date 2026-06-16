import { extractProblemSlug } from './lib/problemSlug'
import { getWhiteboardRoot, waitForLeetCodeLayout } from './lib/leetcodeMount'
import './content-inject.css'

const IFRAME_CLASS = 'lc-whiteboard-iframe'

function getEmbedUrl(slug: string): string {
  return chrome.runtime.getURL(
    `embed.html?problem=${encodeURIComponent(slug)}`,
  )
}

function mountEmbedIframe() {
  const root = getWhiteboardRoot()
  const slug = extractProblemSlug(window.location.href)
  if (!root || !slug) return

  const nextUrl = getEmbedUrl(slug)
  let iframe = root.querySelector(
    `iframe.${IFRAME_CLASS}`,
  ) as HTMLIFrameElement | null

  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.className = IFRAME_CLASS
    iframe.title = 'LeetCode Whiteboard'
    iframe.loading = 'eager'
    iframe.setAttribute(
      'allow',
      'clipboard-read; clipboard-write',
    )
    root.appendChild(iframe)
  }

  if (iframe.src !== nextUrl) {
    iframe.src = nextUrl
  }
}

function teardownEmbedIframe() {
  getWhiteboardRoot()?.replaceChildren()
}

// Preload the iframe as soon as the panel shell exists so the first tab click is faster.
waitForLeetCodeLayout({
  onReady: mountEmbedIframe,
  onActivate: mountEmbedIframe,
  onTeardown: teardownEmbedIframe,
})
