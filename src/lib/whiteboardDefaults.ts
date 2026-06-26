import { DefaultColorStyle, type Editor } from 'tldraw'

export function applyWhiteboardDefaults(editor: Editor) {
  editor.user.updateUserPreferences({ colorScheme: 'dark' })
  editor.setStyleForNextShapes(DefaultColorStyle, 'white')
}
