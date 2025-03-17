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
  
  appIdsContainer.innerHTML = '';

  const urls = Object.keys(appIds);

  if (urls.length === 0) {
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
            
            // Send to server after storing locally
            sendAppIdsToServer(activeTab.url, response.appIds);
          });
        } else {
          showStatus('No App IDs found on this page', 'error');
        }
      });
    });
  });
}

// Send app IDs to server with authentication
function sendAppIdsToServer(url, appIds) {
  chrome.storage.local.get(["user"], (data) => {
    if (!data.user || !data.user.token) {
      alert("Session expired. Please log in again.");
      window.open("popup-auth-html.html", "_self");
      return;
    }

    fetch("http://157.66.191.31.16:30166/api/app-ids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.user.token}`
      },
      body: JSON.stringify({ url, appIds, timestamp: new Date().toISOString() })
    })
    .then(response => response.json())
    .then(serverResponse => {
      console.log("Server Response:", serverResponse);
      showStatus("App IDs successfully sent to server!", "success");
    })
    .catch(error => {
      console.error("Error sending App IDs:", error);
      showStatus("Failed to send App IDs", "error");
    });
  });
}

// Clear all stored app IDs
function clearAllData() {
  chrome.runtime.sendMessage({ action: 'clear_data' }, (response) => {
    if (response.success) {
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