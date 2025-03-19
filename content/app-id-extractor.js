// Extract App ID from the URL (numeric, max 6 digits)
function extractAppIdFromURL() {
  const url = window.location.href;
  const match = url.match(/\b\d{1,6}\b/g);  // Find numbers in the URL
  return match ? match[0] : null;  // Return the first match if found
}

// Send the App ID to the background script
function processURL() {
  const appId = extractAppIdFromURL();

  if (appId) {
    console.log(`Found App ID in URL: ${appId}`);
    
    // Send extracted App ID to the background script
    chrome.runtime.sendMessage({
      action: 'app_ids_found',
      appIds: [appId],  // Send as an array
      url: window.location.href
    });
  } else {
    console.log('No App ID found in the URL');
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extract_app_id") {
    const appId = extractAppIdFromURL();
    sendResponse({ appId: appId });
  }
});


// Run on page load
window.addEventListener('load', processURL);

// Listen for manual scan trigger
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scan_page_now') {
    const appId = extractAppIdFromURL();
    sendResponse({ appIds: appId ? [appId] : [] });
  }
  return true;
});
