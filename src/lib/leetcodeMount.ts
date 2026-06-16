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
  const midpoint = window.innerWidth / 2

  return Array.from(document.querySelectorAll('.flexlayout__tab')).filter((el) => {
    const rect = el.getBoundingClientRect()
    return rect.width > 80 && rect.height > 80 && rect.x < midpoint
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

function createTabButton(): HTMLDivElement {
  const button = document.createElement('div')
  button.id = TAB_ID
  button.className =
    'flexlayout__tab_button flexlayout__tab_button_top lc-whiteboard-tab'
  button.setAttribute('role', 'tab')
  button.setAttribute('aria-selected', 'false')
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

  const tabbar = tabset.querySelector('#description_tabbar_outer')
  const tabbarHeight = tabbar?.getBoundingClientRect().height ?? 36
  panel.style.top = `${tabbarHeight}px`

  const root = document.createElement('div')
  root.id = ROOT_ID
  root.className = 'lc-whiteboard-root'
  panel.appendChild(root)

  tabset.appendChild(panel)
  return panel
}

function attachNativeTabListeners(
  tabset: HTMLElement,
  onNativeTabSelected: () => void,
): () => void {
  const tabbar = tabset.querySelector('#description_tabbar_outer')
  if (!tabbar) return () => undefined

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest('.flexlayout__tab_button')
    if (!button || button.id === TAB_ID) return
    onNativeTabSelected()
  }

  tabbar.addEventListener('click', onClick, true)
  return () => tabbar.removeEventListener('click', onClick, true)
}

export function getWhiteboardRoot(): HTMLElement | null {
  return document.getElementById(ROOT_ID)
}

export function mountLeetCodeWhiteboardUi(): LeetCodeMountHandles | null {
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
  }

  let active = false

  const showWhiteboard = () => {
    active = true
    clearNativeTabSelection(tabset)
    setNativeTabSelected(tabButton!, true)
    tabButton!.setAttribute('aria-selected', 'true')
    panel!.hidden = false
    hideLeftPanelContent()
  }

  const hideWhiteboard = () => {
    active = false
    setNativeTabSelected(tabButton!, false)
    tabButton!.setAttribute('aria-selected', 'false')
    panel!.hidden = true
    showLeftPanelContent()
  }

  if (!tabButton.dataset.lcWhiteboardBound) {
    tabButton.dataset.lcWhiteboardBound = 'true'
    tabButton.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      showWhiteboard()
    })
  }

  const detachNativeListeners = attachNativeTabListeners(tabset, hideWhiteboard)

  return {
    showWhiteboard,
    hideWhiteboard,
    isWhiteboardActive: () => active,
    destroy: () => {
      detachNativeListeners()
      tabButton?.remove()
      panel?.remove()
    },
  }
}

export function waitForLeetCodeLayout(
  onReady: (handles: LeetCodeMountHandles) => void,
): () => void {
  let handles: LeetCodeMountHandles | null = null
  let lastUrl = location.href

  const tryMount = () => {
    if (!location.pathname.includes('/problems/')) {
      handles?.destroy()
      handles = null
      return
    }

    const next = mountLeetCodeWhiteboardUi()
    if (!next) return

    if (handles && handles !== next) {
      handles.destroy()
    }

    handles = next
    onReady(handles)
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      handles?.destroy()
      handles = null
    }
    tryMount()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  tryMount()

  return () => {
    observer.disconnect()
    handles?.destroy()
    handles = null
  }
}
