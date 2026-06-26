import { useMemo, useState } from 'react'
import type { SavedBoardSummary } from '../hooks/useSavedBoards'
import { formatProblemTitle, getLeetCodeProblemUrl } from '../lib/problemTitle'
import { normalizeProblemSlug } from '../lib/problemSlug'

interface ProblemSidebarProps {
  boards: SavedBoardSummary[]
  boardsLoading: boolean
  boardsError: string | null
  activeSlug: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  onSelectProblem: (slug: string) => void
  onOpenNewProblem: (slug: string) => void
  onRequestDelete: (slug: string) => void
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

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 4.5h10M6 4.5V3.5h4v1M5 4.5l.5 8h5l.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProblemSidebar({
  boards,
  boardsLoading,
  boardsError,
  activeSlug,
  collapsed,
  onToggleCollapse,
  onSelectProblem,
  onOpenNewProblem,
  onRequestDelete,
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
    const normalized = normalizeProblemSlug(newSlug)
    if (!normalized) return
    onOpenNewProblem(normalized)
    setNewSlug('')
  }

  return (
    <aside
      className={`problem-sidebar${collapsed ? ' problem-sidebar--collapsed' : ''}`}
      aria-label="Saved problems"
      aria-hidden={collapsed}
    >
      <div className="problem-sidebar__header">
        <div>
          <p className="problem-sidebar__eyebrow">Your boards</p>
          <h2 className="problem-sidebar__title">Problems</h2>
        </div>
        <div className="problem-sidebar__header-actions">
          <span className="problem-sidebar__count">{boards.length}</span>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            aria-label="Hide sidebar and toolbar"
            title="Hide sidebar and toolbar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M10 3L5 8l5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
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
              <div
                key={board.slug}
                role="listitem"
                className={`problem-sidebar__item-row${isActive ? ' problem-sidebar__item-row--active' : ''}`}
              >
                <button
                  type="button"
                  className="problem-sidebar__item"
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
                <button
                  type="button"
                  className="problem-sidebar__delete-btn"
                  aria-label={`Delete ${formatProblemTitle(board.slug)} board`}
                  title="Delete board"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRequestDelete(board.slug)
                  }}
                >
                  <DeleteIcon />
                </button>
              </div>
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
