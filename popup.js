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
        // Save URL and content to storage
        var savedVersion = {
          url: currentUrl,
          content: data
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
      link.textContent = 'Version ' + (index + 1);
      link.addEventListener('click', function () {
        openSavedVersion(index);
      });
      listItem.appendChild(link);
      versionsList.appendChild(listItem);
    });
  });
}

function openSavedVersion(index) {
  // Retrieve saved versions from storage and open the saved content in a new tab
  chrome.storage.local.get('savedVersions', function (result) {
    var versions = result.savedVersions || [];
    if (versions.length > index) {
      var savedVersion = versions[index];
      // Create a new tab with formatted text content
      chrome.tabs.create({ url: 'data:text/plain;charset=utf-8,' + encodeURIComponent(savedVersion.content) });
    }
  });
}
