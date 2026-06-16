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
  readonly incomingSnapshot: TLEditorSnapshot | null
  readonly ready: boolean
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
    { initialSnapshot, incomingSnapshot, ready, onChange },
    ref,
  ) {
    const editorRef = useRef<Editor | null>(null)
    const initialAppliedRef = useRef(false)
    const loadedKeyRef = useRef<string | null>(null)
    const isApplyingRemoteRef = useRef(false)

    const notifyLocalChange = useCallback(
      (editor: Editor) => {
        if (isApplyingRemoteRef.current) return
        const snapshot = getSnapshot(editor.store)
        loadedKeyRef.current = JSON.stringify(snapshot)
        onChange(snapshot)
      },
      [onChange],
    )

    const applySnapshot = useCallback((snapshot: TLEditorSnapshot | null) => {
      const editor = editorRef.current
      if (!editor) return

      const nextKey = snapshot ? JSON.stringify(snapshot) : '__empty__'
      if (loadedKeyRef.current === nextKey) return

      isApplyingRemoteRef.current = true
      replaceSnapshot(editor, snapshot)
      loadedKeyRef.current = nextKey

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
      if (!ready || !initialAppliedRef.current) return
      applySnapshot(incomingSnapshot)
    }, [applySnapshot, incomingSnapshot, ready])

    return (
      <div className="whiteboard-container">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor
            applyInitialSnapshot()

            // Listen to all user edits (draw, erase, delete) — not just document scope.
            editor.store.listen(
              () => {
                notifyLocalChange(editor)
              },
              { source: 'user' },
            )
          }}
        />
      </div>
    )
  },
)
