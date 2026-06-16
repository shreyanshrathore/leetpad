// Enable opening the side panel when the extension icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set side panel behavior:', error))

function parseAccessToken(responseUrl) {
  const hash = new URL(responseUrl).hash.replace(/^#/, '')
  return new URLSearchParams(hash).get('access_token')
}

function launchGoogleOAuth() {
  const manifest = chrome.runtime.getManifest()
  const clientId = manifest.oauth2?.client_id

  if (!clientId) {
    return Promise.reject(
      new Error('Missing Google OAuth client ID. Rebuild the extension with VITE_GOOGLE_OAUTH_CLIENT_ID.'),
    )
  }

  const redirectUri = chrome.identity.getRedirectURL()
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'token')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'openid email profile')

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) {
          reject(new Error(chrome.runtime.lastError?.message ?? 'Sign-in cancelled'))
          return
        }

        const accessToken = parseAccessToken(url)
        if (!accessToken) {
          reject(new Error('Google did not return an access token'))
          return
        }

        resolve(accessToken)
      },
    )
  })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GOOGLE_SIGN_IN') return undefined

  launchGoogleOAuth()
    .then((accessToken) => sendResponse({ ok: true, accessToken }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }),
    )

  return true
})

// Only enable the side panel on LeetCode problem pages.
chrome.tabs.onUpdated.addListener(async (tabId, _info, tab) => {
  if (!tab.url) return

  const isLeetCodeProblem = tab.url.includes('leetcode.com/problems/')

  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: isLeetCodeProblem,
    })
  } catch (error) {
    console.error('Failed to update side panel options:', error)
  }
})
