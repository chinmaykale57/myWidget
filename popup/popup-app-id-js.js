// Add this to the top of popup-app-id-js.js
function checkAuth() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["user"], (data) => {
      if (!data.user || !data.user.token) {
        window.open("popup-auth-html.html", "_self");
        reject("Not authenticated");
      } else {
        resolve(data.user);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkAuth();
    
    const appIdsContainer = document.getElementById('app-ids-container');
    const emptyState = document.getElementById('empty-state');
    const scanBtn = document.getElementById('scan-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const statusEl = document.getElementById('status');

    // Load and display app IDs
    loadAppIds();

    // Button event listeners
    scanBtn.addEventListener('click', scanCurrentPage);
    clearBtn.addEventListener('click', clearAllData);
    copyAllBtn.addEventListener('click', copyAllAppIds);

  } catch (error) {
    console.log("Authentication check failed:", error);
    // No need to do anything else as redirection already happened
    return;
  }
});

// Load app IDs from storage
function loadAppIds() {
  chrome.runtime.sendMessage({ action: 'get_all_app_ids' }, (response) => {
    if (response && response.appIds) {
      displayAppIds(response.appIds);
    }
  });
}

// Display app IDs in the popup
function displayAppIds(appIds) {
  const appIdsContainer = document.getElementById('app-ids-container');
  const emptyState = document.getElementById('empty-state');
  
  // Clear the container first
  appIdsContainer.innerHTML = '';

  // Check if appIds is valid and has properties
  if (!appIds || typeof appIds !== 'object') {
    emptyState.style.display = 'block';
    return;
  }

  const urls = Object.keys(appIds);

  // Fixed: Check length after getting keys
  if (!urls || urls.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  urls.forEach(url => {
    const ids = appIds[url];
    if (!ids || ids.length === 0) return;

    const group = document.createElement('div');
    group.className = 'app-id-group';

    const urlContainer = document.createElement('div');
    urlContainer.className = 'url';

    const urlText = document.createElement('span');
    urlText.textContent = url;
    urlText.title = url;
    urlContainer.appendChild(urlText);

    const copyUrlBtn = document.createElement('button');
    copyUrlBtn.className = 'copy-btn';
    copyUrlBtn.textContent = 'Copy URL';
    copyUrlBtn.addEventListener('click', () => copyToClipboard(url, 'URL copied!'));
    urlContainer.appendChild(copyUrlBtn);

    group.appendChild(urlContainer);

    const idsContainer = document.createElement('div');
    idsContainer.className = 'app-ids';

    ids.forEach(id => {
      const idElement = document.createElement('span');
      idElement.className = 'app-id';
      idElement.textContent = id;
      idElement.title = 'Click to copy';
      idElement.addEventListener('click', () => copyToClipboard(id, 'App ID copied!'));
      idsContainer.appendChild(idElement);
    });

    const copyIdsBtn = document.createElement('button');
    copyIdsBtn.className = 'copy-btn';
    copyIdsBtn.textContent = 'Copy All IDs';
    copyIdsBtn.addEventListener('click', () => copyToClipboard(ids.join(', '), 'All App IDs copied!'));

    idsContainer.appendChild(copyIdsBtn);
    group.appendChild(idsContainer);

    appIdsContainer.appendChild(group);
  });
}

// Scan current page for app IDs
function scanCurrentPage() {
  chrome.storage.local.get(["user"], (data) => {
    if (!data.user || !data.user.token) {
      alert("Session expired. Please log in again.");
      window.open("popup-auth-html.html", "_self");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab) {
        showStatus('No active tab found', 'error');
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: 'scan_page_now' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: Content script not available', 'error');
          return;
        }

        if (response && response.appIds) {
          chrome.runtime.sendMessage({
            action: 'app_ids_found',
            appIds: response.appIds,
            url: activeTab.url
          }, () => {
            loadAppIds();
            showStatus(`${response.appIds.length} App IDs found`, 'success');
          });
        } else {
          showStatus('No App IDs found on this page', 'error');
        }
      });
    });
  });
}

// Clear all stored app IDs
function clearAllData() {
  chrome.runtime.sendMessage({ action: 'clear_data' }, (response) => {
    if (response && response.success) {
      loadAppIds();
      showStatus('All App IDs cleared', 'success');
    } else {
      showStatus('Error clearing data', 'error');
    }
  });
}

// Copy all app IDs to clipboard
function copyAllAppIds() {
  chrome.runtime.sendMessage({ action: 'get_all_app_ids' }, (response) => {
    if (response && response.appIds) {
      const allAppIds = Object.values(response.appIds).flat().join(', ');
      if (allAppIds) {
        copyToClipboard(allAppIds, 'All App IDs copied!');
      } else {
        showStatus('No App IDs to copy', 'error');
      }
    }
  });
}

// Copy text to clipboard
function copyToClipboard(text, message) {
  navigator.clipboard.writeText(text).then(() => {
    showStatus(message, 'success');
  }).catch(() => {
    showStatus('Failed to copy', 'error');
  });
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}