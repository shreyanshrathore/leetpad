import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import { getWhiteboardRoot, waitForLeetCodeLayout } from './lib/leetcodeMount'
import { getAppMode } from './lib/runtimeContext'
import './styles.css'
import './embedded.css'

let reactRoot: Root | null = null
let mountedContainer: HTMLElement | null = null

function mountReactApp() {
  const container = getWhiteboardRoot()
  if (!container) return

  if (reactRoot && mountedContainer === container) return

  if (reactRoot) {
    reactRoot.unmount()
    reactRoot = null
    mountedContainer = null
  }

  reactRoot = createRoot(container)
  mountedContainer = container
  reactRoot.render(
    <StrictMode>
      <App mode={getAppMode()} />
    </StrictMode>,
  )
}

function teardownReactApp() {
  reactRoot?.unmount()
  reactRoot = null
  mountedContainer = null
}

const stopWaiting = waitForLeetCodeLayout({
  onReady: mountReactApp,
  onActivate: mountReactApp,
  onTeardown: teardownReactApp,
})

window.addEventListener('pagehide', () => {
  stopWaiting()
  teardownReactApp()
})
