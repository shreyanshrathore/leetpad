export function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime?.id) &&
    window.location.protocol === 'chrome-extension:'
  )
}
