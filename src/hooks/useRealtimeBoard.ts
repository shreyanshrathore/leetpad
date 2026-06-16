import { useCallback, useEffect, useRef, useState } from 'react'
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import type { TLEditorSnapshot } from 'tldraw'
import { db } from '../firebase'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface BoardDocument {
  boardData: TLEditorSnapshot | null
  updatedAt: Timestamp | null
}

function getBoardRef(userId: string, problemSlug: string) {
  return doc(db, 'users', userId, 'boards', problemSlug)
}

/**
 * Realtime Firestore sync for a single problem whiteboard.
 */
export function useRealtimeBoard(userId: string | null, problemSlug: string | null) {
  const [snapshot, setSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const isRemoteUpdate = useRef(false)
  // When Firestore emits, React applies the snapshot in an effect *after* this
  // callback. Keep the remote lock a bit longer to avoid clobbering local edits.
  const saveTimeoutRef = useRef<number | null>(null)
  const latestSnapshotRef = useRef<TLEditorSnapshot | null>(null)

  // Listen for remote changes from other devices.
  useEffect(() => {
    if (!userId || !problemSlug) {
      setSnapshot(null)
      setReady(false)
      return
    }

    setReady(false)
    setError(null)

    const boardRef = getBoardRef(userId, problemSlug)

    const unsubscribe = onSnapshot(
      boardRef,
      (docSnap) => {
        const data = docSnap.data() as BoardDocument | undefined
        const remoteSnapshot = data?.boardData ?? null

        isRemoteUpdate.current = true
        setSnapshot(remoteSnapshot)
        latestSnapshotRef.current = remoteSnapshot
        setReady(true)
        setSaveStatus('saved')

        // Reset after React has a chance to apply `loadSnapshot` on the canvas.
        window.setTimeout(() => {
          isRemoteUpdate.current = false
        }, 250)
      },
      (err) => {
        setError(err.message)
        setReady(true)
      },
    )

    return unsubscribe
  }, [userId, problemSlug])

  const saveSnapshot = useCallback(
    async (nextSnapshot: TLEditorSnapshot) => {
      if (!userId || !problemSlug) return

      setSaveStatus('saving')

      try {
        await setDoc(
          getBoardRef(userId, problemSlug),
          {
            boardData: nextSnapshot,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        setSaveStatus('saved')
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save whiteboard'
        setError(message)
        setSaveStatus('error')
      }
    },
    [userId, problemSlug],
  )

  const queueSave = useCallback(
    (nextSnapshot: TLEditorSnapshot) => {
      if (isRemoteUpdate.current) return

      latestSnapshotRef.current = nextSnapshot

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }

      // Debounce writes to keep Firestore usage low.
      saveTimeoutRef.current = window.setTimeout(() => {
        if (latestSnapshotRef.current) {
          void saveSnapshot(latestSnapshotRef.current)
        }
      }, 500)
    },
    [saveSnapshot],
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    snapshot,
    ready,
    saveStatus,
    error,
    queueSave,
  }
}
