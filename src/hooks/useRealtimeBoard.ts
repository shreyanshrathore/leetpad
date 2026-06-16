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
import { isExtensionContext } from '../lib/isExtension'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type PreviewStatus = 'idle' | 'syncing' | 'synced'

interface BoardDocument {
  boardData: TLEditorSnapshot | null
  updatedAt: Timestamp | null
  clientId?: string
}

const PREVIEW_IDLE_MS = 1200
const PREVIEW_MIN_INTERVAL_MS = 2000
const LOCAL_EDIT_LOCK_MS = 2500

function getSavedBoardRef(userId: string, problemSlug: string) {
  return doc(db, 'users', userId, 'boards', problemSlug)
}

function getPreviewRef(userId: string, problemSlug: string) {
  return doc(db, 'users', userId, 'previews', problemSlug)
}

function snapshotKey(snapshot: TLEditorSnapshot | null): string {
  return snapshot ? JSON.stringify(snapshot) : '__empty__'
}

/**
 * Preview sync while drawing + manual save to the persisted board.
 * iPad edits locally; extension mirrors preview updates only.
 */
export function useRealtimeBoard(userId: string | null, problemSlug: string | null) {
  const isMirrorDevice = isExtensionContext()
  const clientIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client-${Date.now()}`,
  )

  const [initialSnapshot, setInitialSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [remoteSnapshot, setRemoteSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const latestLocalRef = useRef<TLEditorSnapshot | null>(null)
  const getSnapshotRef = useRef<(() => TLEditorSnapshot | null) | null>(null)
  const isEditingRef = useRef(false)
  const idleTimerRef = useRef<number | null>(null)
  const editLockTimerRef = useRef<number | null>(null)
  const pendingPreviewRef = useRef<TLEditorSnapshot | null>(null)
  const previewThrottleTimerRef = useRef<number | null>(null)
  const lastPreviewWriteRef = useRef(0)
  const lastOwnPreviewKeyRef = useRef<string | null>(null)
  const initialLoadedRef = useRef(false)
  const savedLoadedRef = useRef(false)

  const markLocalEdit = useCallback(() => {
    isEditingRef.current = true
    setIsDrawing(true)

    if (editLockTimerRef.current) {
      window.clearTimeout(editLockTimerRef.current)
    }

    editLockTimerRef.current = window.setTimeout(() => {
      isEditingRef.current = false
      setIsDrawing(false)
    }, LOCAL_EDIT_LOCK_MS)
  }, [])

  // Load the saved board once when opening a problem.
  useEffect(() => {
    if (!userId || !problemSlug) {
      setInitialSnapshot(null)
      setRemoteSnapshot(null)
      setReady(false)
      initialLoadedRef.current = false
      savedLoadedRef.current = false
      return
    }

    setReady(false)
    setError(null)
    initialLoadedRef.current = false
    savedLoadedRef.current = false

    const unsubscribe = onSnapshot(
      getSavedBoardRef(userId, problemSlug),
      (docSnap) => {
        const data = docSnap.data() as BoardDocument | undefined
        const saved = data?.boardData ?? null

        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true
          savedLoadedRef.current = true
          setInitialSnapshot(saved)
          setRemoteSnapshot(saved)
          latestLocalRef.current = saved
          lastOwnPreviewKeyRef.current = snapshotKey(saved)
          setReady(true)
          setSaveStatus(docSnap.exists() ? 'saved' : 'idle')
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
      savedLoadedRef.current = false
    }
  }, [userId, problemSlug])

  // Extension mirrors iPad preview. iPad never applies preview back onto itself.
  useEffect(() => {
    if (!userId || !problemSlug || !isMirrorDevice) return

    const unsubscribe = onSnapshot(
      getPreviewRef(userId, problemSlug),
      (docSnap) => {
        if (!savedLoadedRef.current) return
        if (isEditingRef.current) return

        const data = docSnap.data() as BoardDocument | undefined
        const preview = data?.boardData ?? null
        if (!preview) return

        // Ignore preview writes that originated on this device.
        if (data?.clientId === clientIdRef.current) return

        const previewKey = snapshotKey(preview)
        if (previewKey === lastOwnPreviewKeyRef.current) return

        setRemoteSnapshot(preview)
        setPreviewStatus('synced')
      },
      (err) => {
        setError(err.message)
      },
    )

    return unsubscribe
  }, [userId, problemSlug, isMirrorDevice])

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
      lastOwnPreviewKeyRef.current = snapshotKey(snapshot)
      setPreviewStatus('syncing')

      try {
        await setDoc(
          getPreviewRef(userId, problemSlug),
          {
            boardData: snapshot,
            clientId: clientIdRef.current,
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
      markLocalEdit()

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current)
      }

      idleTimerRef.current = window.setTimeout(() => {
        void flushPreview(nextSnapshot)
      }, PREVIEW_IDLE_MS)
    },
    [flushPreview, markLocalEdit],
  )

  const registerGetSnapshot = useCallback((getter: () => TLEditorSnapshot | null) => {
    getSnapshotRef.current = getter
  }, [])

  const saveBoard = useCallback(async () => {
    if (!userId || !problemSlug) return

    const snapshot = getSnapshotRef.current?.() ?? latestLocalRef.current
    if (!snapshot) {
      setError('Canvas is not ready yet.')
      return
    }

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

      await setDoc(
        getPreviewRef(userId, problemSlug),
        {
          boardData: snapshot,
          clientId: clientIdRef.current,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      latestLocalRef.current = snapshot
      lastOwnPreviewKeyRef.current = snapshotKey(snapshot)

      if (isMirrorDevice) {
        setRemoteSnapshot(snapshot)
      }

      setSaveStatus('saved')
      setPreviewStatus('synced')
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save whiteboard'
      setError(message)
      setSaveStatus('error')
    }
  }, [userId, problemSlug, isMirrorDevice])

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      if (editLockTimerRef.current) window.clearTimeout(editLockTimerRef.current)
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
    registerGetSnapshot,
    enableRemoteSync: isMirrorDevice,
  }
}
