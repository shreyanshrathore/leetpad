import { useMemo, useState } from 'react'
import type { SavedBoardSummary } from '../hooks/useSavedBoards'
import { formatProblemTitle, getLeetCodeProblemUrl } from '../lib/problemTitle'

interface ProblemSidebarProps {
  boards: SavedBoardSummary[]
  boardsLoading: boolean
  boardsError: string | null
  activeSlug: string | null
  onSelectProblem: (slug: string) => void
  onOpenNewProblem: (slug: string) => void
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Not saved yet'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function ProblemSidebar({
  boards,
  boardsLoading,
  boardsError,
  activeSlug,
  onSelectProblem,
  onOpenNewProblem,
}: ProblemSidebarProps) {
  const [query, setQuery] = useState('')
  const [newSlug, setNewSlug] = useState('')

  const filteredBoards = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return boards

    return boards.filter((board) => {
      const title = formatProblemTitle(board.slug).toLowerCase()
      return board.slug.includes(trimmed) || title.includes(trimmed)
    })
  }, [boards, query])

  function handleOpenNewProblem() {
    const trimmed = newSlug.trim()
    if (!trimmed) return
    onOpenNewProblem(trimmed)
    setNewSlug('')
  }

  return (
    <aside className="problem-sidebar" aria-label="Saved problems">
      <div className="problem-sidebar__header">
        <div>
          <p className="problem-sidebar__eyebrow">Your boards</p>
          <h2 className="problem-sidebar__title">Problems</h2>
        </div>
        <span className="problem-sidebar__count">{boards.length}</span>
      </div>

      <div className="problem-sidebar__search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search problems..."
          aria-label="Search saved problems"
        />
      </div>

      <div className="problem-sidebar__list" role="list">
        {boardsLoading ? (
          <p className="problem-sidebar__message">Loading your boards...</p>
        ) : boardsError ? (
          <p className="problem-sidebar__message problem-sidebar__message--error">
            {boardsError}
          </p>
        ) : filteredBoards.length === 0 ? (
          <p className="problem-sidebar__message">
            {boards.length === 0
              ? 'No saved boards yet. Open a new problem below to start drawing.'
              : 'No problems match your search.'}
          </p>
        ) : (
          filteredBoards.map((board) => {
            const isActive = board.slug === activeSlug
            return (
              <button
                key={board.slug}
                type="button"
                role="listitem"
                className={`problem-sidebar__item${isActive ? ' problem-sidebar__item--active' : ''}`}
                onClick={() => onSelectProblem(board.slug)}
              >
                <span className="problem-sidebar__item-title">
                  {formatProblemTitle(board.slug)}
                </span>
                <span className="problem-sidebar__item-meta">
                  <span className="problem-sidebar__item-slug">{board.slug}</span>
                  <span className="problem-sidebar__item-time">
                    {formatRelativeTime(board.updatedAt)}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="problem-sidebar__footer">
        <p className="problem-sidebar__footer-label">Open a new problem</p>
        <div className="problem-sidebar__new-row">
          <input
            type="text"
            value={newSlug}
            onChange={(event) => setNewSlug(event.target.value)}
            placeholder="e.g. two-sum"
            aria-label="LeetCode problem slug"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleOpenNewProblem()
              }
            }}
          />
          <button
            type="button"
            onClick={handleOpenNewProblem}
            disabled={!newSlug.trim()}
          >
            Open
          </button>
        </div>
        {activeSlug ? (
          <a
            className="problem-sidebar__leetcode-link"
            href={getLeetCodeProblemUrl(activeSlug)}
            target="_blank"
            rel="noreferrer"
          >
            View on LeetCode
          </a>
        ) : null}
      </div>
    </aside>
  )
}
