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
  snapshot: TLEditorSnapshot | null
  ready: boolean
  onChange: (snapshot: TLEditorSnapshot) => void
}

export function Whiteboard({ snapshot, ready, onChange }: WhiteboardProps) {
  const editorRef = useRef<Editor | null>(null)
  const loadedSnapshotRef = useRef<string | null>(null)

  // Load remote snapshot into the canvas when it changes.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !ready) return

    const serialized = snapshot ? JSON.stringify(snapshot) : '__empty__'
    if (loadedSnapshotRef.current === serialized) return

    if (snapshot) {
      loadSnapshot(editor.store, snapshot)
    } else {
      editor.store.clear()
    }

    loadedSnapshotRef.current = serialized
  }, [snapshot, ready])

  return (
    <div className="whiteboard-container">
      <Tldraw
        onMount={(editor) => {
          editorRef.current = editor

          editor.store.listen(
            () => {
              onChange(getSnapshot(editor.store))
            },
            { source: 'user', scope: 'document' },
          )
        }}
      />
    </div>
  )
}
