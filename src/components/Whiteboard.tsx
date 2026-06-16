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
  readonly enableRemoteSync: boolean
  readonly onChange: (snapshot: TLEditorSnapshot) => void
}

function replaceSnapshot(editor: Editor, snapshot: TLEditorSnapshot | null) {
  editor.store.mergeRemoteChanges(() => {
    if (snapshot) {
      loadSnapshot(editor.store, snapshot)
      return
    }
    editor.store.clear()
  })
}

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(
  function Whiteboard(
    {
      initialSnapshot,
      remoteSnapshot,
      ready,
      isDrawing,
      enableRemoteSync,
      onChange,
    },
    ref,
  ) {
    const editorRef = useRef<Editor | null>(null)
    const initialAppliedRef = useRef(false)
    const loadedSnapshotKeyRef = useRef<string | null>(null)
    const isApplyingRemoteRef = useRef(false)

    const applySnapshot = useCallback((snapshot: TLEditorSnapshot | null) => {
      const editor = editorRef.current
      if (!editor) return

      const nextKey = snapshot ? JSON.stringify(snapshot) : '__empty__'
      if (loadedSnapshotKeyRef.current === nextKey) return

      isApplyingRemoteRef.current = true
      replaceSnapshot(editor, snapshot)
      loadedSnapshotKeyRef.current = nextKey

      window.setTimeout(() => {
        isApplyingRemoteRef.current = false
      }, 150)
    }, [])

    const applyInitialSnapshot = useCallback(() => {
      const editor = editorRef.current
      if (!editor || !ready || initialAppliedRef.current) return

      initialAppliedRef.current = true
      applySnapshot(initialSnapshot)
    }, [applySnapshot, initialSnapshot, ready])

    useImperativeHandle(ref, () => ({
      getSnapshot: () => {
        const editor = editorRef.current
        return editor ? getSnapshot(editor.store) : null
      },
    }))

    useEffect(() => {
      applyInitialSnapshot()
    }, [applyInitialSnapshot])

    useEffect(() => {
      if (!enableRemoteSync) return
      if (!ready || !initialAppliedRef.current) return
      if (isDrawing) return

      applySnapshot(remoteSnapshot)
    }, [applySnapshot, enableRemoteSync, isDrawing, ready, remoteSnapshot])

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
