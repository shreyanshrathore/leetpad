export type AppMode = 'standalone' | 'embedded'

export function isExtensionPageContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime?.id) &&
    window.location.protocol === 'chrome-extension:'
  )
}

export function isContentScriptContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime?.id) &&
    window.location.hostname.endsWith('leetcode.com')
  )
}

/** Extension page (side panel) or LeetCode content script. */
export function isExtensionRuntime(): boolean {
  return isExtensionPageContext() || isContentScriptContext()
}

export function getAppMode(): AppMode {
  return isContentScriptContext() ? 'embedded' : 'standalone'
}
