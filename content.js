chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'saveOldVersion') {
    const oldVersion = document.documentElement.outerHTML;
    
    console.log(oldVersion); 
  }
});

