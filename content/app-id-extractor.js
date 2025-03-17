// App ID Extractor - Content Script
// This script scans the current webpage for app IDs and sends them to the background script

// Configuration - modify these patterns to match your specific app ID format
const APP_ID_PATTERNS = [
  /app-id[=:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,  // Example: app-id="ABC123" or app-id: "ABC123"
  /appId[=:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,   // Example: appId="ABC123" or appId: "ABC123"
  /application-id[=:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi, // Example: application-id="ABC123"
  /data-app-id[=:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi, // Example: data-app-id="ABC123"
  /\bapp_id\s*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/gi, // Example: app_id: "ABC123"
];

// Utility function to find all app IDs in text
function findAppIds(text) {
  const matches = new Set();
  
  // Apply all patterns to find matches
  APP_ID_PATTERNS.forEach(pattern => {
    // Reset the RegExp lastIndex to ensure we find all occurrences
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        matches.add(match[1]);
      }
    }
  });
  
  return Array.from(matches);
}

// Function to extract app IDs from the entire page
function extractAppIdsFromPage() {
  // Get the HTML content of the page
  const pageContent = document.documentElement.outerHTML;
  
  // Search for app IDs in the page source
  const appIdsFromSource = findAppIds(pageContent);
  
  // Also search in the text content of the page
  const textContent = document.body.textContent;
  const appIdsFromText = findAppIds(textContent);
  
  // Combine and remove duplicates
  const allAppIds = [...new Set([...appIdsFromSource, ...appIdsFromText])];
  
  return allAppIds;
}

// Extract app IDs and send them to the background script
function processPage() {
  const appIds = extractAppIdsFromPage();
  
  if (appIds.length > 0) {
    console.log(`Found ${appIds.length} app IDs on the page:`, appIds);
    
    // Send app IDs to the background script
    chrome.runtime.sendMessage({
      action: 'app_ids_found',
      appIds: appIds,
      url: window.location.href
    });
  } else {
    console.log('No app IDs found on this page');
  }
}

// Run the process when page is fully loaded
window.addEventListener('load', processPage);

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scan_page_now') {
    // Manually triggered scan
    const appIds = extractAppIdsFromPage();
    sendResponse({ appIds: appIds });
  }
  return true;
});
