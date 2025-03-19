
// Check user authentication
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
    
    document.getElementById('scan-btn').addEventListener('click', scanCurrentPage);
    document.getElementById('clear-btn').addEventListener('click', clearAllData);
    document.getElementById('copy-all-btn').addEventListener('click', copyAllAppIds);
    loadAppIds();
  } catch (error) {
    console.log("Authentication check failed:", error);
  }
});

// Load stored App IDs from background script
function loadAppIds() {
  chrome.runtime.sendMessage({ action: 'get_all_app_ids' }, (response) => {
    if (response && response.appIds) {
      displayAppIds(response.appIds);
    }
  });
}


// Scan the current tab's URL for App ID
function scanCurrentPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      showStatus("No active tab found", "error");
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: "extract_app_id" }, (response) => {
      if (response && response.appId) {
        chrome.runtime.sendMessage({
          action: "app_ids_found",
          appIds: [response.appId],
          url: tabs[0].url,
        }, () => {
          loadAppIds();
          showStatus(`App ID ${response.appId} found`, "success");
        });
      } else {
        showStatus("No App ID found in URL", "error");
      }
    });
  });
}


// Clear all stored App IDs
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

// Copy all stored App IDs to clipboard
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

// Show status message in popup
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
  setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkAuth();
    
    document.getElementById('scan-btn').addEventListener('click', scanCurrentPage);
    document.getElementById('clear-btn').addEventListener('click', clearAllData);
    document.getElementById('copy-all-btn').addEventListener('click', copyAllAppIds);
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    
    loadAppIds();
  } catch (error) {
    console.log("Authentication check failed:", error);
  }
});

// Logout function
function logoutUser() {
  chrome.storage.local.remove(["user"], () => {
    window.open("popup-auth-html.html", "_self");
  });
}
