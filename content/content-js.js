// Create and inject the floating widget
function createFloatingWidget() {
  // Create the main container
  const widget = document.createElement('div');
  widget.id = 'floating-assistant';
  widget.className = 'floating-widget';
  
  // Add header with title and controls
  const header = document.createElement('div');
  header.className = 'widget-header';
  
  const title = document.createElement('span');
  title.textContent = 'Assistant';
  
  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'minimize-btn';
  minimizeBtn.textContent = '_';
  minimizeBtn.title = 'Minimize';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.title = 'Close';
  
  header.appendChild(title);
  header.appendChild(minimizeBtn);
  header.appendChild(closeBtn);
  
  // Add content area
  const content = document.createElement('div');
  content.className = 'widget-content';
  content.innerHTML = `
    <p>Your floating assistant is ready!</p>
    <button id="action-button">Perform Action</button>
  `;
  
  // Assemble the widget
  widget.appendChild(header);
  widget.appendChild(content);
  
  // Add to the page
  document.body.appendChild(widget);
  
  // Make the widget draggable
  makeWidgetDraggable(widget, header);
  
  // Add event listeners
  setupEventListeners(widget, minimizeBtn, closeBtn);
  
  return widget;
}

// Function to make the widget draggable
function makeWidgetDraggable(widget, dragHandle) {
  let offsetX, offsetY, isDragging = false;
  
  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - widget.getBoundingClientRect().left;
    offsetY = e.clientY - widget.getBoundingClientRect().top;
    
    // Prevent text selection while dragging
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    widget.style.left = (e.clientX - offsetX) + 'px';
    widget.style.top = (e.clientY - offsetY) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    
    // Save position for future sessions
    if (widget.style.left && widget.style.top) {
      chrome.storage.local.set({
        widgetPosition: {
          left: widget.style.left,
          top: widget.style.top
        }
      });
    }
  });
}

// Set up event listeners for widget controls
function setupEventListeners(widget, minimizeBtn, closeBtn) {
  // Minimize button
  minimizeBtn.addEventListener('click', () => {
    const content = widget.querySelector('.widget-content');
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
    
    // Update button text
    minimizeBtn.textContent = content.style.display === 'none' ? '□' : '_';
    minimizeBtn.title = content.style.display === 'none' ? 'Maximize' : 'Minimize';
  });
  
  // Close button
  closeBtn.addEventListener('click', () => {
    widget.style.display = 'none';
  });
  
  // Action button
  const actionButton = widget.querySelector('#action-button');
  actionButton.addEventListener('click', () => {
    // This will be where you connect to your database or AI in the future
    alert('This will connect to your database and AI integration in the future!');
  });
}

// Initialize widget
function initWidget() {
  // Check if widget already exists
  if (document.getElementById('floating-assistant')) {
    return;
  }
  
  const widget = createFloatingWidget();
  
  // Restore position if saved
  chrome.storage.local.get('widgetPosition', (data) => {
    if (data.widgetPosition) {
      widget.style.left = data.widgetPosition.left;
      widget.style.top = data.widgetPosition.top;
    }
  });
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggleWidget') {
    const widget = document.getElementById('floating-assistant');
    
    if (widget) {
      widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
    } else {
      initWidget();
    }
  }
});

// Initialize when the page is fully loaded
window.addEventListener('load', initWidget);
