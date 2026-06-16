import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth/web-extension'
import { auth } from '../firebase'

function parseAccessToken(responseUrl: string): string | null {
  const hash = new URL(responseUrl).hash.replace(/^#/, '')
  return new URLSearchParams(hash).get('access_token')
}

function getOAuthClientIdError(clientId: string): string | null {
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    return 'OAuth client ID must end with .apps.googleusercontent.com'
  }

  const idPart = clientId.replace('.apps.googleusercontent.com', '')

  // Chrome extension IDs are 32 lowercase letters with no number prefix.
  if (/^[a-z]{32}$/.test(idPart)) {
    return (
      'You used your Chrome extension ID as the OAuth client ID. ' +
      'In Google Cloud Console, create an OAuth client of type "Chrome Extension", ' +
      'paste your extension ID there, then copy the Client ID Google generates ' +
      '(it starts with numbers, like 729497727270-xxxxx.apps.googleusercontent.com).'
    )
  }

  if (!/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(clientId)) {
    return (
      'Invalid OAuth client ID format. Copy the full Client ID from ' +
      'Google Cloud Console → Credentials → your Chrome Extension OAuth client.'
    )
  }

  return null
}

export function getExtensionOAuthSetupInfo() {
  return {
    extensionId: chrome.runtime.id,
    redirectUri: chrome.identity.getRedirectURL(),
  }
}

function formatRedirectUriHelp(): string {
  const { extensionId, redirectUri } = getExtensionOAuthSetupInfo()

  return (
    `Add this redirect URI in Google Cloud Console → Credentials → your OAuth client → ` +
    `Authorized redirect URIs: ${redirectUri} ` +
    `(Extension ID: ${extensionId})`
  )
}

/**
 * Google sign-in for Chrome extensions.
 * Uses chrome.identity because signInWithPopup is blocked in MV3 side panels.
 */
export async function signInWithGoogleExtension(): Promise<void> {
  const manifest = chrome.runtime.getManifest() as chrome.runtime.ManifestV3 & {
    oauth2?: { client_id: string }
  }

  const clientId = manifest.oauth2?.client_id
  if (!clientId) {
    throw new Error(
      'Missing Google OAuth client ID. Add VITE_GOOGLE_OAUTH_CLIENT_ID to .env and rebuild.',
    )
  }

  const clientIdError = getOAuthClientIdError(clientId)
  if (clientIdError) {
    throw new Error(clientIdError)
  }

  const redirectUri = chrome.identity.getRedirectURL()
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'token')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'openid email profile')

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) {
          const message = chrome.runtime.lastError?.message ?? 'Sign-in cancelled'
          if (message.includes('redirect_uri_mismatch') || message.includes('bad client id')) {
            reject(new Error(`${message}. ${formatRedirectUriHelp()}`))
            return
          }
          reject(new Error(message))
          return
        }
        resolve(url)
      },
    )
  })

  const accessToken = parseAccessToken(responseUrl)
  if (!accessToken) {
    throw new Error('Google did not return an access token')
  }

  const credential = GoogleAuthProvider.credential(null, accessToken)
  await signInWithCredential(auth, credential)
}
