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
export type PreviewStatus = 'idle' | 'syncing' | 'synced'

interface BoardDocument {
  boardData: TLEditorSnapshot | null
  updatedAt: Timestamp | null
}

const PREVIEW_IDLE_MS = 1000
const PREVIEW_MIN_INTERVAL_MS = 1500

function getSavedBoardRef(userId: string, problemSlug: string) {
  return doc(db, 'users', userId, 'boards', problemSlug)
}

function getPreviewRef(userId: string, problemSlug: string) {
  return doc(db, 'users', userId, 'previews', problemSlug)
}

/**
 * Preview sync while drawing + manual save to the persisted board.
 */
export function useRealtimeBoard(userId: string | null, problemSlug: string | null) {
  const [initialSnapshot, setInitialSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [remoteSnapshot, setRemoteSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const latestLocalRef = useRef<TLEditorSnapshot | null>(null)
  const isDrawingRef = useRef(false)
  const idleTimerRef = useRef<number | null>(null)
  const pendingPreviewRef = useRef<TLEditorSnapshot | null>(null)
  const previewThrottleTimerRef = useRef<number | null>(null)
  const lastPreviewWriteRef = useRef(0)
  const initialLoadedRef = useRef(false)

  // Load the saved board once when opening a problem.
  useEffect(() => {
    if (!userId || !problemSlug) {
      setInitialSnapshot(null)
      setRemoteSnapshot(null)
      setReady(false)
      initialLoadedRef.current = false
      return
    }

    setReady(false)
    setError(null)
    initialLoadedRef.current = false

    const unsubscribe = onSnapshot(
      getSavedBoardRef(userId, problemSlug),
      (docSnap) => {
        const data = docSnap.data() as BoardDocument | undefined
        const saved = data?.boardData ?? null

        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true
          setInitialSnapshot(saved)
          setRemoteSnapshot(saved)
          latestLocalRef.current = saved
          setReady(true)
          setSaveStatus(saved ? 'saved' : 'idle')
        }
      },
      (err) => {
        setError(err.message)
        setReady(true)
      },
    )

    return () => {
      unsubscribe()
      initialLoadedRef.current = false
    }
  }, [userId, problemSlug])

  // Listen for live preview updates from the other device.
  useEffect(() => {
    if (!userId || !problemSlug) return

    const unsubscribe = onSnapshot(
      getPreviewRef(userId, problemSlug),
      (docSnap) => {
        const data = docSnap.data() as BoardDocument | undefined
        const preview = data?.boardData ?? null
        if (!preview) return

        // Do not overwrite local strokes while the user is actively drawing.
        if (isDrawingRef.current) return

        setRemoteSnapshot(preview)
        setPreviewStatus('synced')
      },
      (err) => {
        setError(err.message)
      },
    )

    return unsubscribe
  }, [userId, problemSlug])

  const flushPreview = useCallback(
    async (snapshot: TLEditorSnapshot) => {
      if (!userId || !problemSlug) return

      const now = Date.now()
      const elapsed = now - lastPreviewWriteRef.current

      if (elapsed < PREVIEW_MIN_INTERVAL_MS) {
        pendingPreviewRef.current = snapshot
        if (previewThrottleTimerRef.current) {
          window.clearTimeout(previewThrottleTimerRef.current)
        }
        previewThrottleTimerRef.current = window.setTimeout(() => {
          const pending = pendingPreviewRef.current
          if (pending) {
            pendingPreviewRef.current = null
            void flushPreview(pending)
          }
        }, PREVIEW_MIN_INTERVAL_MS - elapsed)
        return
      }

      lastPreviewWriteRef.current = now
      setPreviewStatus('syncing')

      try {
        await setDoc(
          getPreviewRef(userId, problemSlug),
          {
            boardData: snapshot,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        setPreviewStatus('synced')
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to sync preview'
        setError(message)
      }
    },
    [userId, problemSlug],
  )

  const onLocalChange = useCallback(
    (nextSnapshot: TLEditorSnapshot) => {
      latestLocalRef.current = nextSnapshot
      isDrawingRef.current = true
      setIsDrawing(true)

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current)
      }

      // After the user pauses, push a lightweight preview update.
      idleTimerRef.current = window.setTimeout(() => {
        isDrawingRef.current = false
        setIsDrawing(false)
        void flushPreview(nextSnapshot)
      }, PREVIEW_IDLE_MS)
    },
    [flushPreview],
  )

  const saveBoard = useCallback(async () => {
    if (!userId || !problemSlug) return

    const snapshot = latestLocalRef.current
    if (!snapshot) return

    setSaveStatus('saving')

    try {
      await setDoc(
        getSavedBoardRef(userId, problemSlug),
        {
          boardData: snapshot,
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
  }, [userId, problemSlug])

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      if (previewThrottleTimerRef.current) {
        window.clearTimeout(previewThrottleTimerRef.current)
      }
    }
  }, [])

  return {
    initialSnapshot,
    remoteSnapshot,
    ready,
    saveStatus,
    previewStatus,
    error,
    isDrawing,
    onLocalChange,
    saveBoard,
  }
}
