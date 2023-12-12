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

        // Fetch all JavaScript and JSON files referenced on the current page
        fetchAndSaveFiles(currentUrl, savedVersion);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  });
}

function fetchAndSaveFiles(baseUrl, savedVersion) {
  // Fetch the current page content to extract JS and JSON file URLs
  fetch(baseUrl)
    .then(response => response.text())
    .then(data => {
      var jsUrls = extractFileUrls(data, 'js');
      var jsonUrls = extractFileUrls(data, 'json');

      // Fetch and save JS files
      fetchAndSaveFilesOfType(baseUrl, jsUrls, 'js', savedVersion);

      // Fetch and save JSON files
      fetchAndSaveFilesOfType(baseUrl, jsonUrls, 'json', savedVersion);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}

function extractFileUrls(htmlContent, fileType) {
  // Use regex to extract URLs of files with the specified extension
  var regex = new RegExp(`(?:src|href)\\s*=\\s*["']([^"']*\\.${fileType})["']`, 'gi');
  var matches = htmlContent.match(regex);

  if (matches) {
    return matches.map(match => match.replace(/(?:src|href)\s*=\s*["'](.*)["']/, '$1'));
  } else {
    return [];
  }
}

function fetchAndSaveFilesOfType(baseUrl, fileUrls, fileType, savedVersion) {
  // Fetch each file and save its content
  var fetchPromises = fileUrls.map(fileUrl => {
    // Make sure the URL is absolute
    var absoluteUrl = new URL(fileUrl, baseUrl).href;

    return fetch(absoluteUrl)
      .then(response => response.text())
      .then(fileContent => {
        // Save URL and content to storage
        var fileVersion = {
          url: absoluteUrl,
          content: fileContent
        };

        // Retrieve existing saved versions from storage
        chrome.storage.local.get('savedVersions', function (result) {
          var versions = result.savedVersions || [];
          versions.push(fileVersion);

          // Save updated versions to storage
          chrome.storage.local.set({ 'savedVersions': versions }, function () {
            // Refresh list after saving
            displaySavedVersions();
          });
        });
      })
      .catch(error => {
        console.error(`Error fetching ${fileType} file: ${absoluteUrl}`, error);
      });
  });

  // Wait for all fetches to complete
  Promise.all(fetchPromises)
    .then(() => {
      // Display saved versions after all files are saved
      displaySavedVersions();
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
          //link.textContent = (index + 1) + ': ' + version.url;
          link.addEventListener('click', function () {
              openSavedVersion(index);
          });

          // Create a button around the link
          var button = document.createElement('button');
          button.textContent = (index + 1) + ': ' + version.url;
          button.addEventListener('click', function () {
              openSavedVersion(index);
          });

          // Append the button to the list item
          listItem.appendChild(button);
          listItem.appendChild(link);
          versionsList.appendChild(listItem);
      });
  });
}

function displayDiffView(addedCode, removedCode, savedContent) {
  var htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Code Difference</title>
      <style>
        /* Your styles for displaying code differences */
        body { background-color: #222; font-family: 'Arial', sans-serif; color: white;git }
        .added { background-color: #e6ffed; }
        .removed { background-color: #ffd6cc; }
        table { border-collapse: collapse; width: 100%; }
        td { padding: 3px; }
      </style>
    </head>
    <body>
    </br>
      <h2>Saved Code</h2>
      <pre>${savedContent}</pre>
      <h2>Added Code</h2>
      <table border="1">
        ${generateDiffTable(addedCode, 'added')}
      </table>
      <h2>Removed Code</h2>
      <table border="1">
        ${generateDiffTable(removedCode, 'removed')}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  chrome.tabs.create({
    url: url
  });
}

function openSavedVersion(index) {
  chrome.storage.local.get('savedVersions', function (result) {
    var versions = result.savedVersions || [];
    if (versions.length > index) {
      var savedVersion = versions[index];
      var savedContent = savedVersion.content;

      // Fetch the current content of the website
      fetch(savedVersion.url)
        .then(response => response.text())
        .then(currentData => {
          var addedCode = findAddedCode(savedContent, currentData);
          var removedCode = findRemovedCode(savedContent, currentData);

          displayDiffView(addedCode, removedCode, savedContent);
        })
        .catch(error => {
          console.error('Error fetching current data:', error);
        });
    }
  });
}




function generateDiffTable(code, className) {
  if (!code || code.trim() === '') {
    return `<tr><td>No ${className} code</td></tr>`;
  }

  var lines = code.split('\n');
  var tableContent = lines.map(line => `<tr><td class="${className}">${line}</td></tr>`).join('');
  return tableContent;
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

function findAddedCode(savedContent, currentData) {
  // Split the content into lines
  var savedLines = savedContent.split('\n');
  var currentLines = currentData.split('\n');

  // Find lines present in currentData but not in savedContent
  var addedLines = currentLines.filter(line => !savedLines.includes(line));

  return addedLines.join('\n');
}

function findRemovedCode(savedContent, currentData) {
  // Split the content into lines
  var savedLines = savedContent.split('\n');
  var currentLines = currentData.split('\n');

  // Find lines present in savedContent but not in currentData
  var removedLines = savedLines.filter(line => !currentLines.includes(line));

  return removedLines.join('\n');
}


function displayAddedCode(addedCode) {
  // Display added code
  console.log('Added Code:', addedCode);
  // Update UI or perform actions with added code as needed
}

function displayRemovedCode(removedCode) {
  // Display removed code
  console.log('Removed Code:', removedCode);
  // Update UI or perform actions with removed code as needed
}


// Function to escape HTML characters
function escapeHtml(html) {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
}
