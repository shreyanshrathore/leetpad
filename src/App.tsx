import { useEffect, useRef } from 'react'
import { AuthGate } from './components/AuthGate'
import { Whiteboard, type WhiteboardHandle } from './components/Whiteboard'
import { useAuth } from './hooks/useAuth'
import { useProblemSlug } from './hooks/useProblemSlug'
import { useRealtimeBoard } from './hooks/useRealtimeBoard'
import type { AppMode } from './lib/runtimeContext'

function StatusText({ saveStatus }: { readonly saveStatus: string }) {
  if (saveStatus === 'saving') {
    return <span className="save-status save-status--saving">Saving...</span>
  }

  if (saveStatus === 'saved') {
    return <span className="save-status save-status--saved">Saved</span>
  }

  if (saveStatus === 'error') {
    return <span className="save-status save-status--error">Save failed</span>
  }

  return <span className="save-status">Unsaved changes</span>
}

function AppContent({ mode }: { readonly mode: AppMode }) {
  const embedded = mode === 'embedded'
  const { user, logout } = useAuth()
  const { slug, loading, needsManualInput, manualSlug, setManualSlug, commitManualSlug } =
    useProblemSlug()
  const {
    initialSnapshot,
    incomingSnapshot,
    ready,
    saveStatus,
    error,
    onLocalChange,
    saveBoard,
    registerGetSnapshot,
  } = useRealtimeBoard(user?.uid ?? null, slug)

  const whiteboardRef = useRef<WhiteboardHandle>(null)

  useEffect(() => {
    registerGetSnapshot(() => whiteboardRef.current?.getSnapshot() ?? null)
  }, [registerGetSnapshot])

  if (loading) {
    return (
      <div className="centered-message">
        {embedded ? 'Loading whiteboard...' : 'Detecting LeetCode problem...'}
      </div>
    )
  }

  if (!embedded && needsManualInput) {
    return (
      <div className="auth-screen">
        <h1>Choose a problem</h1>
        <p>
          Open this page with <code>?problem=two-sum</code> or enter a slug
          manually.
        </p>
        <input
          type="text"
          placeholder="two-sum"
          value={manualSlug}
          onChange={(event) => setManualSlug(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitManualSlug()
            }
          }}
        />
        <button type="button" onClick={commitManualSlug} disabled={!manualSlug.trim()}>
          Open whiteboard
        </button>
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="centered-message">
        {embedded
          ? 'Navigate to a LeetCode problem to use the whiteboard.'
          : 'Open a LeetCode problem page to use the whiteboard.'}
      </div>
    )
  }

  return (
    <div className={`app-shell${embedded ? ' app-shell--embedded' : ''}`}>
      <header className="app-header">
        <div>
          {!embedded ? <p className="eyebrow">LeetCode problem</p> : null}
          <h1>{slug}</h1>
        </div>
        <div className="header-actions">
          <StatusText saveStatus={saveStatus} />
          <button type="button" onClick={() => void saveBoard()}>
            Save
          </button>
          <button type="button" className="secondary-button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <Whiteboard
        key={slug}
        ref={whiteboardRef}
        initialSnapshot={initialSnapshot}
        incomingSnapshot={incomingSnapshot}
        ready={ready}
        onChange={onLocalChange}
      />
    </div>
  )
}

interface AppProps {
  readonly mode?: AppMode
}

export default function App({ mode = 'standalone' }: AppProps) {
  return (
    <AuthGate compact={mode === 'embedded'}>
      <AppContent mode={mode} />
    </AuthGate>
  )
}
