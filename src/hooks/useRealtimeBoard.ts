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

function getSavedBoardRef(userId: string, problemSlug: string) {
  return doc(db, 'users', userId, 'boards', problemSlug)
}

function snapshotKey(snapshot: TLEditorSnapshot | null): string {
  return snapshot ? JSON.stringify(snapshot) : '__empty__'
}

/**
 * One canvas per problem. Both iPad and extension can edit locally.
 * Firestore updates on Save; the other device applies when not actively editing.
 */
export function useRealtimeBoard(userId: string | null, problemSlug: string | null) {
  const [initialSnapshot, setInitialSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [incomingSnapshot, setIncomingSnapshot] = useState<TLEditorSnapshot | null>(null)
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const latestLocalRef = useRef<TLEditorSnapshot | null>(null)
  const getSnapshotRef = useRef<(() => TLEditorSnapshot | null) | null>(null)
  const isEditingRef = useRef(false)
  const editTimerRef = useRef<number | null>(null)
  const initialLoadedRef = useRef(false)
  const lastLoadedKeyRef = useRef<string | null>(null)

  const markLocalEdit = useCallback(() => {
    isEditingRef.current = true

    if (editTimerRef.current) {
      window.clearTimeout(editTimerRef.current)
    }

    editTimerRef.current = window.setTimeout(() => {
      isEditingRef.current = false
    }, 1500)
  }, [])

  useEffect(() => {
    if (!userId || !problemSlug) {
      setInitialSnapshot(null)
      setIncomingSnapshot(null)
      setReady(false)
      initialLoadedRef.current = false
      lastLoadedKeyRef.current = null
      return
    }

    setReady(false)
    setError(null)
    initialLoadedRef.current = false
    lastLoadedKeyRef.current = null

    const unsubscribe = onSnapshot(
      getSavedBoardRef(userId, problemSlug),
      (docSnap) => {
        const data = docSnap.data() as BoardDocument | undefined
        const saved = data?.boardData ?? null
        const savedKey = snapshotKey(saved)

        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true
          lastLoadedKeyRef.current = savedKey
          setInitialSnapshot(saved)
          setIncomingSnapshot(saved)
          latestLocalRef.current = saved
          setReady(true)
          setSaveStatus(docSnap.exists() ? 'saved' : 'idle')
          return
        }

        // Apply saves from the other device when this device is idle.
        if (isEditingRef.current) return
        if (savedKey === lastLoadedKeyRef.current) return

        lastLoadedKeyRef.current = savedKey
        setIncomingSnapshot(saved)
        setSaveStatus('saved')
      },
      (err) => {
        setError(err.message)
        setReady(true)
      },
    )

    return () => {
      unsubscribe()
      initialLoadedRef.current = false
      lastLoadedKeyRef.current = null
    }
  }, [userId, problemSlug])

  const onLocalChange = useCallback((nextSnapshot: TLEditorSnapshot) => {
    latestLocalRef.current = nextSnapshot
    markLocalEdit()
    setSaveStatus('idle')
  }, [markLocalEdit])

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
      // Full document replace — do not use merge:true. Erased shapes are removed
      // records in boardData.document.store; merge would leave old nested keys.
      await setDoc(getSavedBoardRef(userId, problemSlug), {
        boardData: snapshot,
        updatedAt: serverTimestamp(),
      })

      latestLocalRef.current = snapshot
      lastLoadedKeyRef.current = snapshotKey(snapshot)
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
      if (editTimerRef.current) window.clearTimeout(editTimerRef.current)
    }
  }, [])

  return {
    initialSnapshot,
    incomingSnapshot,
    ready,
    saveStatus,
    error,
    onLocalChange,
    saveBoard,
    registerGetSnapshot,
  }
}
