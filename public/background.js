// Enable opening the side panel when the extension icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set side panel behavior:', error))

// Only enable the side panel on LeetCode problem pages.
chrome.tabs.onUpdated.addListener(async (tabId, _info, tab) => {
  if (!tab.url) return

  const isLeetCodeProblem = tab.url.includes('leetcode.com/problems/')

  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: isLeetCodeProblem,
    })
  } catch (error) {
    console.error('Failed to update side panel options:', error)
  }
})
