import { useEffect, useRef } from 'react'
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  type Editor,
  type TLEditorSnapshot,
} from 'tldraw'
import 'tldraw/tldraw.css'

interface WhiteboardProps {
  readonly snapshot: TLEditorSnapshot | null
  readonly ready: boolean
  readonly onChange: (snapshot: TLEditorSnapshot) => void
}

export function Whiteboard({ snapshot, ready, onChange }: WhiteboardProps) {
  const editorRef = useRef<Editor | null>(null)
  const loadedSnapshotRef = useRef<string | null>(null)
  // Prevent remote `loadSnapshot` from triggering local save writes.
  const isApplyingRemoteRef = useRef(false)

  // Load remote snapshot into the canvas when it changes.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !ready) return

    const serialized = snapshot ? JSON.stringify(snapshot) : '__empty__'
    if (loadedSnapshotRef.current === serialized) return

    isApplyingRemoteRef.current = true
    if (snapshot) {
      loadSnapshot(editor.store, snapshot)
    } else {
      editor.store.clear()
    }

    loadedSnapshotRef.current = serialized

    // `editor.store.listen` may fire after the effect body, so keep the
    // suppress flag for a short window.
    window.setTimeout(() => {
      isApplyingRemoteRef.current = false
    }, 100)
  }, [snapshot, ready])

  return (
    <div className="whiteboard-container">
      <Tldraw
        onMount={(editor) => {
          editorRef.current = editor

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
}
