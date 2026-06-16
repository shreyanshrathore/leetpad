import { useEffect, useRef } from 'react'
import { AuthGate } from './components/AuthGate'
import { Whiteboard, type WhiteboardHandle } from './components/Whiteboard'
import { useAuth } from './hooks/useAuth'
import { useProblemSlug } from './hooks/useProblemSlug'
import { useRealtimeBoard } from './hooks/useRealtimeBoard'

function StatusText({ saveStatus }: { saveStatus: string }) {
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

function AppContent() {
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
    enableRemoteSync,
  } = useRealtimeBoard(user?.uid ?? null, slug)

  const whiteboardRef = useRef<WhiteboardHandle>(null)

  useEffect(() => {
    registerGetSnapshot(() => whiteboardRef.current?.getSnapshot() ?? null)
  }, [registerGetSnapshot])

  if (loading) {
    return <div className="centered-message">Detecting LeetCode problem...</div>
  }

  if (needsManualInput) {
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
        Open a LeetCode problem page to use the whiteboard.
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">LeetCode problem</p>
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

      {!ready ? (
        <div className="centered-message">Loading whiteboard...</div>
      ) : (
        <Whiteboard
          key={slug}
          ref={whiteboardRef}
          initialSnapshot={initialSnapshot}
          incomingSnapshot={incomingSnapshot}
          ready={ready}
          enableRemoteSync={enableRemoteSync}
          onChange={onLocalChange}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <AppContent />
    </AuthGate>
  )
}
