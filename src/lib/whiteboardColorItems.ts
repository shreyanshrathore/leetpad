import type { StyleValuesForUi } from 'tldraw'

/** Color swatches for the whiteboard, with white first as the default pen color. */
export const WHITEBOARD_COLOR_ITEMS: StyleValuesForUi<string> = [
  { value: 'white', icon: 'color' },
  { value: 'black', icon: 'color' },
  { value: 'grey', icon: 'color' },
  { value: 'light-violet', icon: 'color' },
  { value: 'violet', icon: 'color' },
  { value: 'blue', icon: 'color' },
  { value: 'light-blue', icon: 'color' },
  { value: 'yellow', icon: 'color' },
  { value: 'orange', icon: 'color' },
  { value: 'green', icon: 'color' },
  { value: 'light-green', icon: 'color' },
  { value: 'light-red', icon: 'color' },
  { value: 'red', icon: 'color' },
]
