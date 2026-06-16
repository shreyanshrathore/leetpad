const TAB_ID = 'lc-whiteboard-tab'
const PANEL_ID = 'lc-whiteboard-panel'
const ROOT_ID = 'lc-whiteboard-root'
const TAB_LABEL = 'Whiteboard'

export interface LeetCodeMountHandles {
  showWhiteboard: () => void
  hideWhiteboard: () => void
  isWhiteboardActive: () => boolean
  destroy: () => void
}

export interface LeetCodeLayoutCallbacks {
  onReady: () => void
  onTeardown: () => void
  onActivate: () => void
}

function getLeftPanelTabset(): HTMLElement | null {
  const tabbar = document.querySelector('#description_tabbar_outer')
  return tabbar?.closest('.flexlayout__tabset') as HTMLElement | null
}

function getTabContainer(tabset: HTMLElement): HTMLElement | null {
  return tabset.querySelector(
    '.flexlayout__tabset_tabbar_inner_tab_container',
  ) as HTMLElement | null
}

function getLeftPanelTabs(): HTMLElement[] {
  const tabset = getLeftPanelTabset()
  if (!tabset) return []

  const tabsetRect = tabset.getBoundingClientRect()

  return Array.from(document.querySelectorAll('.flexlayout__tab')).filter((el) => {
    const rect = el.getBoundingClientRect()
    if (rect.width < 80 || rect.height < 80) return false

    const centerX = rect.left + rect.width / 2
    return centerX >= tabsetRect.left && centerX <= tabsetRect.right
  }) as HTMLElement[]
}

function setNativeTabSelected(tabButton: HTMLElement, selected: boolean) {
  tabButton.classList.toggle('flexlayout__tab_button--selected', selected)
  tabButton.classList.toggle('lc-whiteboard-tab--selected', selected)
}

function clearNativeTabSelection(tabset: HTMLElement) {
  tabset
    .querySelectorAll('.flexlayout__tab_button.flexlayout__tab_button--selected')
    .forEach((button) => {
      button.classList.remove('flexlayout__tab_button--selected')
    })
}

function hideLeftPanelContent() {
  getLeftPanelTabs().forEach((tab) => {
    if (!tab.dataset.lcWhiteboardPrevVisibility) {
      tab.dataset.lcWhiteboardPrevVisibility = tab.style.visibility || ''
      tab.dataset.lcWhiteboardPrevPointerEvents = tab.style.pointerEvents || ''
    }
    tab.style.visibility = 'hidden'
    tab.style.pointerEvents = 'none'
  })
}

function showLeftPanelContent() {
  getLeftPanelTabs().forEach((tab) => {
    tab.style.visibility = tab.dataset.lcWhiteboardPrevVisibility ?? ''
    tab.style.pointerEvents = tab.dataset.lcWhiteboardPrevPointerEvents ?? ''
    delete tab.dataset.lcWhiteboardPrevVisibility
    delete tab.dataset.lcWhiteboardPrevPointerEvents
  })
}

function syncPanelGeometry(panel: HTMLElement, tabset: HTMLElement) {
  const tabbar = tabset.querySelector('#description_tabbar_outer')
  const tabbarHeight = tabbar?.getBoundingClientRect().height ?? 36
  panel.style.top = `${tabbarHeight}px`
}

function createTabButton(): HTMLDivElement {
  const button = document.createElement('div')
  button.id = TAB_ID
  button.className =
    'flexlayout__tab_button flexlayout__tab_button_top lc-whiteboard-tab'
  button.setAttribute('role', 'tab')
  button.setAttribute('aria-selected', 'false')
  button.setAttribute('tabindex', '0')
  button.innerHTML = `
    <div class="flexlayout__tab_button_content">
      <div class="relative flex items-center gap-1 overflow-hidden text-sm capitalize lc-whiteboard-tab__label">
        <svg class="lc-whiteboard-tab__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 2h6v1H5V5zm0 2h4v1H5V7zm0 2h5v1H5V9z"/>
        </svg>
        <span>${TAB_LABEL}</span>
      </div>
    </div>
  `
  return button
}

function createPanel(tabset: HTMLElement): HTMLDivElement {
  const panel = document.createElement('div')
  panel.id = PANEL_ID
  panel.className = 'lc-whiteboard-panel'
  panel.hidden = true
  syncPanelGeometry(panel, tabset)

  const root = document.createElement('div')
  root.id = ROOT_ID
  root.className = 'lc-whiteboard-root'
  panel.appendChild(root)

  tabset.appendChild(panel)
  return panel
}

function bindTabActivation(
  tabButton: HTMLDivElement,
  showWhiteboard: () => void,
): void {
  const activate = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    showWhiteboard()
  }

  tabButton.addEventListener('mousedown', activate, true)
  tabButton.addEventListener('click', activate, true)
  tabButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      activate(event)
    }
  })
}

function attachNativeTabListeners(
  tabset: HTMLElement,
  onNativeTabSelected: () => void,
): () => void {
  const tabbar = tabset.querySelector('#description_tabbar_outer')
  if (!tabbar) return () => undefined

  const onPointerDown = (event: Event) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest('.flexlayout__tab_button')
    if (!button || button.id === TAB_ID) return
    onNativeTabSelected()
  }

  tabbar.addEventListener('mousedown', onPointerDown, true)
  tabbar.addEventListener('click', onPointerDown, true)
  return () => {
    tabbar.removeEventListener('mousedown', onPointerDown, true)
    tabbar.removeEventListener('click', onPointerDown, true)
  }
}

export function getWhiteboardRoot(): HTMLElement | null {
  return document.getElementById(ROOT_ID)
}

function isMountedInDom(): boolean {
  return Boolean(document.getElementById(TAB_ID) && document.getElementById(PANEL_ID))
}

export function mountLeetCodeWhiteboardUi(
  callbacks: Pick<LeetCodeLayoutCallbacks, 'onActivate'>,
): LeetCodeMountHandles | null {
  const tabset = getLeftPanelTabset()
  const tabContainer = tabset ? getTabContainer(tabset) : null
  if (!tabset || !tabContainer) return null

  let tabButton = document.getElementById(TAB_ID) as HTMLDivElement | null
  let panel = document.getElementById(PANEL_ID) as HTMLDivElement | null

  if (!tabButton) {
    tabButton = createTabButton()
    tabContainer.appendChild(tabButton)
  }

  if (!panel) {
    panel = createPanel(tabset)
  } else if (!panel.isConnected || panel.parentElement !== tabset) {
    tabset.appendChild(panel)
  }

  syncPanelGeometry(panel, tabset)

  let active = false

  const showWhiteboard = () => {
    active = true
    syncPanelGeometry(panel, tabset)
    clearNativeTabSelection(tabset)
    setNativeTabSelected(tabButton, true)
    tabButton.setAttribute('aria-selected', 'true')
    panel.hidden = false
    panel.style.display = 'flex'
    hideLeftPanelContent()
    callbacks.onActivate()
  }

  const hideWhiteboard = () => {
    active = false
    setNativeTabSelected(tabButton, false)
    tabButton.setAttribute('aria-selected', 'false')
    panel.hidden = true
    panel.style.display = 'none'
    showLeftPanelContent()
  }

  if (!tabButton.dataset.lcWhiteboardBound) {
    tabButton.dataset.lcWhiteboardBound = 'true'
    bindTabActivation(tabButton, showWhiteboard)
  }

  const detachNativeListeners = attachNativeTabListeners(tabset, hideWhiteboard)

  return {
    showWhiteboard,
    hideWhiteboard,
    isWhiteboardActive: () => active,
    destroy: () => {
      detachNativeListeners()
      tabButton.remove()
      panel.remove()
    },
  }
}

export function waitForLeetCodeLayout(callbacks: LeetCodeLayoutCallbacks): () => void {
  let handles: LeetCodeMountHandles | null = null
  let lastUrl = location.href

  const destroyHandles = () => {
    handles?.destroy()
    handles = null
    callbacks.onTeardown()
  }

  const tryMount = () => {
    if (!location.pathname.includes('/problems/')) {
      destroyHandles()
      return
    }

    if (isMountedInDom() && handles) return

    if (handles) {
      destroyHandles()
    }

    const next = mountLeetCodeWhiteboardUi({ onActivate: callbacks.onActivate })
    if (!next) return

    handles = next
    callbacks.onReady()
  }

  let debounceTimer: number | null = null
  const scheduleTryMount = () => {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(tryMount, 100)
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      destroyHandles()
    }
    scheduleTryMount()
  })

  const onResize = () => {
    const panel = document.getElementById(PANEL_ID)
    const tabset = getLeftPanelTabset()
    if (panel && tabset) syncPanelGeometry(panel, tabset)
  }

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  window.addEventListener('resize', onResize)

  tryMount()

  return () => {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    observer.disconnect()
    window.removeEventListener('resize', onResize)
    destroyHandles()
  }
}
