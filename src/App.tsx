import { AuthGate } from './components/AuthGate'
import { Whiteboard } from './components/Whiteboard'
import { useAuth } from './hooks/useAuth'
import { useProblemSlug } from './hooks/useProblemSlug'
import { useRealtimeBoard } from './hooks/useRealtimeBoard'

function SaveStatusText({ status }: { status: string }) {
  const labels: Record<string, string> = {
    idle: 'Ready',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
  }

  return <span className={`save-status save-status--${status}`}>{labels[status] ?? status}</span>
}

function AppContent() {
  const { user, logout } = useAuth()
  const { slug, loading, needsManualInput, manualSlug, setManualSlug } =
    useProblemSlug()
  const { snapshot, ready, saveStatus, error, queueSave } = useRealtimeBoard(
    user?.uid ?? null,
    slug,
  )

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
        />
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
          <SaveStatusText status={saveStatus} />
          <button type="button" className="secondary-button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      {!ready ? (
        <div className="centered-message">Loading whiteboard...</div>
      ) : (
        <Whiteboard snapshot={snapshot} ready={ready} onChange={queueSave} />
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
