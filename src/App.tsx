import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { ProblemSidebar } from './components/ProblemSidebar'
import { Whiteboard, type WhiteboardHandle } from './components/Whiteboard'
import { useAuth } from './hooks/useAuth'
import { useProblemSlug } from './hooks/useProblemSlug'
import { useRealtimeBoard } from './hooks/useRealtimeBoard'
import { useSavedBoards } from './hooks/useSavedBoards'
import { formatProblemTitle } from './lib/problemTitle'
import type { AppMode } from './lib/runtimeContext'
import { isHostedWebApp } from './lib/runtimeContext'

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

const SIDEBAR_COLLAPSED_KEY = 'lc-whiteboard-sidebar-collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

function SidebarReopenButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      className="sidebar-reopen-btn"
      onClick={onClick}
      aria-label="Show sidebar and toolbar"
      title="Show sidebar and toolbar"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M6 3l5 5-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function HostedWelcome() {
  return (
    <div className="hosted-welcome">
      <h2>Select a problem</h2>
      <p>
        Pick a saved board from the left, or open a new LeetCode slug to start a
        fresh whiteboard.
      </p>
    </div>
  )
}

function WhiteboardPanel({
  slug,
  userId,
  logout,
  chromeCollapsed,
}: {
  readonly slug: string
  readonly userId: string
  readonly logout: () => Promise<void>
  readonly chromeCollapsed: boolean
}) {
  const {
    initialSnapshot,
    incomingSnapshot,
    ready,
    saveStatus,
    error,
    onLocalChange,
    saveBoard,
    registerGetSnapshot,
  } = useRealtimeBoard(userId, slug)

  const whiteboardRef = useRef<WhiteboardHandle>(null)

  useEffect(() => {
    registerGetSnapshot(() => whiteboardRef.current?.getSnapshot() ?? null)
  }, [registerGetSnapshot])

  return (
    <div
      className={`app-shell hosted-main__shell${chromeCollapsed ? ' hosted-main__shell--chrome-collapsed' : ''}`}
    >
      {!chromeCollapsed ? (
        <>
          <header className="app-header">
            <div>
              <p className="eyebrow">LeetCode problem</p>
              <h1>{formatProblemTitle(slug)}</h1>
              <p className="hosted-main__slug">{slug}</p>
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
        </>
      ) : null}

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

function HostedAppContent() {
  const { user, logout } = useAuth()
  const { slug, loading, navigateToProblem } = useProblemSlug()
  const { boards, loading: boardsLoading, error: boardsError } = useSavedBoards(
    user?.uid ?? null,
  )
  const autoSelectedRef = useRef(false)
  const [chromeCollapsed, setChromeCollapsed] = useState(readSidebarCollapsed)

  const toggleChrome = useCallback(() => {
    setChromeCollapsed((prev) => {
      const next = !prev
      writeSidebarCollapsed(next)
      return next
    })
  }, [])

  const expandChrome = useCallback(() => {
    setChromeCollapsed(false)
    writeSidebarCollapsed(false)
  }, [])

  useEffect(() => {
    if (loading || boardsLoading || slug || autoSelectedRef.current) return
    if (boards.length === 0) return

    autoSelectedRef.current = true
    navigateToProblem(boards[0].slug)
  }, [boards, boardsLoading, loading, navigateToProblem, slug])

  if (loading) {
    return <div className="centered-message">Loading your workspace...</div>
  }

  return (
    <div
      className={`hosted-layout${chromeCollapsed ? ' hosted-layout--chrome-collapsed' : ''}`}
    >
      <ProblemSidebar
        boards={boards}
        boardsLoading={boardsLoading}
        boardsError={boardsError}
        activeSlug={slug}
        collapsed={chromeCollapsed}
        onToggleCollapse={toggleChrome}
        onSelectProblem={navigateToProblem}
        onOpenNewProblem={navigateToProblem}
      />

      <main className="hosted-main">
        {chromeCollapsed ? <SidebarReopenButton onClick={expandChrome} /> : null}
        {slug && user ? (
          <WhiteboardPanel
            slug={slug}
            userId={user.uid}
            logout={logout}
            chromeCollapsed={chromeCollapsed}
          />
        ) : (
          <HostedWelcome />
        )}
      </main>
    </div>
  )
}

function StandaloneAppContent({ embedded }: { readonly embedded: boolean }) {
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

function AppContent({ mode }: { readonly mode: AppMode }) {
  const embedded = mode === 'embedded'
  if (isHostedWebApp() && !embedded) {
    return <HostedAppContent />
  }
  return <StandaloneAppContent embedded={embedded} />
}

interface AppProps {
  readonly mode?: AppMode
}

export default function App({ mode = 'standalone' }: AppProps) {
  const compact = mode === 'embedded'

  return (
    <AuthGate compact={compact}>
      <AppContent mode={mode} />
    </AuthGate>
  )
}
