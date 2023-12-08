document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('saveButton').addEventListener('click', saveOldVersion);
  displaySavedVersions();
});

function saveOldVersion() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    var currentUrl = currentTab.url;

    // Fetch the current page content
    fetch(currentUrl)
      .then(response => response.text())
      .then(data => {
        // Sanitize HTML tags from the content
        var sanitizedContent = sanitizeHtml(data);

        // Save URL and sanitized content to storage
        var savedVersion = {
          url: currentUrl,
          content: sanitizedContent
        };

        // Retrieve existing saved versions from storage
        chrome.storage.local.get('savedVersions', function (result) {
          var versions = result.savedVersions || [];
          versions.push(savedVersion);

          // Save updated versions to storage
          chrome.storage.local.set({ 'savedVersions': versions }, function () {
            displaySavedVersions(); // Refresh list after saving
          });
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  });
}

// Function to sanitize HTML tags
function sanitizeHtml(html) {
  return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function displaySavedVersions() {
  // Retrieve saved versions from storage and display in popup
  chrome.storage.local.get('savedVersions', function (result) {
    var versions = result.savedVersions || [];
    var versionsList = document.getElementById('versionsList');

    // Clear previous list items
    versionsList.innerHTML = '';

    // Display saved versions as list items
    versions.forEach(function (version, index) {
      var listItem = document.createElement('li');
      var link = document.createElement('a');
      link.href = version.url;
      link.textContent = version.url.split('/')[2]; // get the domain name
      listItem.appendChild(link);
      versionsList.appendChild(listItem);
    });
  });
}

// Function to sanitize HTML tags
function sanitizeHtml(html) {
  return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function displaySavedVersions() {
  // Retrieve saved versions from storage and display in popup
  chrome.storage.local.get('savedVersions', function (result) {
    var versions = result.savedVersions || [];
    var versionsList = document.getElementById('versionsList');

    // Clear previous list items
    versionsList.innerHTML = '';

    // Display saved versions as list items
    versions.forEach(function (version, index) {
      var listItem = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#';
      link.textContent = (index + 1) + ': ' + version.url ;
      link.addEventListener('click', function () {
        openSavedVersion(index);
      });
      listItem.appendChild(link);
      versionsList.appendChild(listItem);
    });
  });
}

function openSavedVersion(index) {
  chrome.storage.local.get('savedVersions', function (result) {
    var versions = result.savedVersions || [];
    if (versions.length > index) {
      var savedVersion = versions[index];
      var content = savedVersion.content;

      // Highlighting API keys and applying basic syntax highlighting
      content = highlightStrings(content);
      content = highlightAPIKeys(content);

      // Create a new tab with beautified content
      chrome.tabs.create({
        url: 'data:text/html,' + encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Saved Version</title>
            <style>
              body { background-color: #222; color: white; font-family: 'Courier New', monospace; }
              pre { padding: 20px; white-space: pre-wrap; }
              .api-key { background-color: yellow; }
              .string { color: #6a90e8; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
          </html>
        `)
      });
    }
  });
}

function highlightStrings(content) {
  // Highlighting strings in JavaScript-like content
  return content.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
}

function highlightAPIKeys(content) {
  // Highlighting potential API keys (example: 'API_KEY', 'Bearer TOKEN')
  const apiKeyRegex = /\b(API_KEY|Bearer\s+[A-Za-z0-9\-_]+)/g;
  return content.replace(apiKeyRegex, '<span class="api-key">$&</span>');
}



// Function to escape HTML characters
function escapeHtml(html) {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
}
