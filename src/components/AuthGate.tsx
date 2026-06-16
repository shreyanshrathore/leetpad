import { useAuth } from '../hooks/useAuth'
import { getExtensionOAuthSetupInfo } from '../lib/extensionAuth'
import { isExtensionPageContext } from '../lib/runtimeContext'

interface AuthGateProps {
  children: React.ReactNode
  compact?: boolean
}

export function AuthGate({ children, compact = false }: AuthGateProps) {
  const { user, loading, error, signInWithGoogle, inExtension } = useAuth()
  const oauthSetup = isExtensionPageContext() ? getExtensionOAuthSetupInfo() : null

  if (loading) {
    return (
      <div className={`centered-message${compact ? ' auth-screen--compact' : ''}`}>
        Checking sign-in status...
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`auth-screen${compact ? ' auth-screen--compact' : ''}`}>
        <h1>{compact ? 'Sign in to draw' : 'LeetCode Whiteboard'}</h1>
        <p>
          {compact
            ? 'Sign in with Google to save and sync your whiteboard for this problem.'
            : 'Sign in with Google to sync drawings across Mac and iPad.'}
          {inExtension ? ' Chrome will open a Google sign-in window.' : null}
        </p>
        <button type="button" onClick={() => void signInWithGoogle()}>
          Continue with Google
        </button>
        {error ? <p className="error-text">{error}</p> : null}
        {oauthSetup ? (
          <div className="auth-hint">
            <p>
              <strong>OAuth setup (one time):</strong> In Google Cloud Console →
              Credentials, use a <strong>Web application</strong> OAuth client and add
              this redirect URI exactly:
            </p>
            <code className="auth-code">{oauthSetup.redirectUri}</code>
            <p>
              Extension ID: <code>{oauthSetup.extensionId}</code>
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  return <>{children}</>
}
