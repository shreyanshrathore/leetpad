import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  type Editor,
  type TLEditorSnapshot,
} from 'tldraw'
import 'tldraw/tldraw.css'

export interface WhiteboardHandle {
  getSnapshot: () => TLEditorSnapshot | null
}

interface WhiteboardProps {
  readonly initialSnapshot: TLEditorSnapshot | null
  readonly remoteSnapshot: TLEditorSnapshot | null
  readonly ready: boolean
  readonly isDrawing: boolean
  readonly onChange: (snapshot: TLEditorSnapshot) => void
}

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(
  function Whiteboard(
    { initialSnapshot, remoteSnapshot, ready, isDrawing, onChange },
    ref,
  ) {
    const editorRef = useRef<Editor | null>(null)
    const initialAppliedRef = useRef(false)
    const loadedRemoteRef = useRef<string | null>(null)
    const isApplyingRemoteRef = useRef(false)

    const applyInitialSnapshot = useCallback(() => {
      const editor = editorRef.current
      if (!editor || !ready || initialAppliedRef.current) return

      initialAppliedRef.current = true
      isApplyingRemoteRef.current = true

      if (initialSnapshot) {
        loadSnapshot(editor.store, initialSnapshot)
        loadedRemoteRef.current = JSON.stringify(initialSnapshot)
      }

      window.setTimeout(() => {
        isApplyingRemoteRef.current = false
      }, 100)
    }, [initialSnapshot, ready])

    useImperativeHandle(ref, () => ({
      getSnapshot: () => {
        const editor = editorRef.current
        return editor ? getSnapshot(editor.store) : null
      },
    }))

    // Apply saved board once editor and Firestore data are both ready.
    useEffect(() => {
      applyInitialSnapshot()
    }, [applyInitialSnapshot])

    // Apply preview updates from the other device.
    useEffect(() => {
      const editor = editorRef.current
      if (!editor || !ready || !initialAppliedRef.current) return
      if (isDrawing) return

      const serialized = remoteSnapshot ? JSON.stringify(remoteSnapshot) : '__empty__'
      if (loadedRemoteRef.current === serialized) return

      isApplyingRemoteRef.current = true
      if (remoteSnapshot) {
        loadSnapshot(editor.store, remoteSnapshot)
      }

      loadedRemoteRef.current = serialized

      window.setTimeout(() => {
        isApplyingRemoteRef.current = false
      }, 100)
    }, [remoteSnapshot, ready, isDrawing])

    return (
      <div className="whiteboard-container">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor
            applyInitialSnapshot()

            editor.store.listen(
              () => {
                if (isApplyingRemoteRef.current) return
                onChange(getSnapshot(editor.store))
              },
              { source: 'user', scope: 'document' },
            )
          }}
        />
      </div>
    )
  },
)
