// App ID Tracker - Background Script
let sessionAppIds = {};

// The specific client domain we want to track (REPLACE THIS WITH YOUR CLIENT'S DOMAIN)
const CLIENT_DOMAIN = "client-site-domain.com"; // Example placeholder

// Initialize when extension loads
function initialize() {
  console.log('App ID Tracker initialized');

  checkAuthStatus();
  
  // Get any previously stored app IDs
  chrome.storage.local.get('sessionAppIds', (data) => {
    if (data.sessionAppIds) {
      sessionAppIds = data.sessionAppIds;
      console.log('Restored app IDs from storage:', 
                  Object.keys(sessionAppIds).length, 'URLs');
    }
  });
}

function checkAuthStatus() {
  chrome.storage.local.get(["user"], (data) => {
    if (!data.user || !data.user.token) {
      console.log('No authentication token found');
      return;
    }
    
    // Basic JWT expiration check
    try {
      const tokenParts = data.user.token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        return;
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime > expirationTime) {
        console.log('Token expired, logging out...');
        chrome.storage.local.remove(["user"]);
      } else {
        console.log('Token valid until', new Date(expirationTime));
      }
    } catch (error) {
      console.error('Error validating token:', error);
    }
  });
}

// Check if URL belongs to the client domain
function isClientSite(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes(CLIENT_DOMAIN);
  } catch (e) {
    console.error('Invalid URL:', url);
    return false;
  }
}

// Save app IDs to local storage
function saveAppIds() {
  chrome.storage.local.set({ sessionAppIds });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle app IDs found on page
  if (message.action === 'app_ids_found') {
    const { appIds, url } = message;
    
    // Only process if from client site
    if (!isClientSite(url)) {
      console.log('Ignoring app IDs from non-client site:', url);
      sendResponse({ success: false, reason: 'not_client_site' });
      return true;
    }
    
    // Store app IDs with the URL as the key
    sessionAppIds[url] = appIds;
    saveAppIds();
    
    // Update badge with count of app IDs found
    updateBadge(appIds.length);
    
    // Send to server if authenticated
    sendToServer(url, appIds);
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle request for all collected app IDs
  if (message.action === 'get_all_app_ids') {
    sendResponse({ appIds: sessionAppIds });
    return true;
  }
  
  // Handle clear data request
  if (message.action === 'clear_data') {
    sessionAppIds = {};
    saveAppIds();
    updateBadge(0);
    sendResponse({ success: true });
    return true;
  }
});

// Update the extension badge with the count of app IDs
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Send app IDs to your server
function sendToServer(url, appIds) {
  chrome.storage.local.get(["user"], (data) => {
    if (!data.user || !data.user.token) {
      console.log('No authentication token found');
      return;
    }
    
    // Use the correct API endpoint
    fetch("http://157.66.191.31:30166/api/app-ids", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.user.token}`
      },
      body: JSON.stringify({
        url,
        appIds,
        timestamp: new Date().toISOString()
      })
    })
    .then(response => {
      if (response.ok) {
        console.log('App IDs sent to server successfully');
        return response.json();
      }
      throw new Error('Network response was not ok');
    })
    .then(data => {
      console.log('Server response:', data);
    })
    .catch(error => {
      console.error('Error sending app IDs to server:', error);
    });
  });
}


initialize();