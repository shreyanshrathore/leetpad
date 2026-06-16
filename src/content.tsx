import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import { getWhiteboardRoot, waitForLeetCodeLayout } from './lib/leetcodeMount'
import { getAppMode } from './lib/runtimeContext'
import './styles.css'
import './embedded.css'

let reactRoot: Root | null = null

function mountReactApp() {
  const container = getWhiteboardRoot()
  if (!container || reactRoot) return

  reactRoot = createRoot(container)
  reactRoot.render(
    <StrictMode>
      <App mode={getAppMode()} />
    </StrictMode>,
  )
}

function teardownReactApp() {
  reactRoot?.unmount()
  reactRoot = null
}

const stopWaiting = waitForLeetCodeLayout(() => {
  mountReactApp()
})

window.addEventListener('pagehide', () => {
  stopWaiting()
  teardownReactApp()
})
