'use strict';

var activeTab, numSlides, myPort, id = 100, screenshots = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function connected(p) {
  myPort = p;
  myPort.onMessage.addListener(async function(m) {
    if (m.capture_slide) {
      chrome.tabs.captureVisibleTab(async function(screenshotUrl) {
        console.log("capturing screenshot for slide " + m.index);
        await sleep(500)
        screenshots.splice(m.index, 0, screenshotUrl);
        myPort.postMessage({next_slide: true, index: (m.index+1)});
      });
    } else if (m.generate_slideshow) {
      console.log("About to capture " + screenshots.length + " slides");
      await sleep(500)
      var viewTabUrl = chrome.extension.getURL('output.html?id=' + id++)
      var targetId = null;
      chrome.tabs.onUpdated.addListener(function listener(tabId, changedProps) {
        // We are waiting for the tab we opened to finish loading.
        // Check that the tab's id matches the tab we opened,
        // and that the tab is done loading.
        if (tabId != targetId || changedProps.status != "complete")
          return;

        // Passing the above test means this is the event we were waiting for.
        // There is nothing we need to do for future onUpdated events, so we
        // use removeListner to stop getting called when onUpdated events fire.
        chrome.tabs.onUpdated.removeListener(listener);

        // Look through all views to find the window which will display
        // the screenshot.  The url of the tab which will display the
        // screenshot includes a query parameter with a unique id, which
        // ensures that exactly one view will have the matching URL.
        var views = chrome.extension.getViews();
        for (var i = 0; i < views.length; i++) {
          var view = views[i];
          if (view.location.href == viewTabUrl) {
            view.addScreenshots(screenshots);
            break;
          }
        }
      });

      chrome.tabs.create({url: viewTabUrl}, function(tab) {
        targetId = tab.id;
      });
    }
  });
}

chrome.runtime.onConnect.addListener(connected);

chrome.browserAction.onClicked.addListener(function() {
  myPort.postMessage({next_slide: true, index: 0});
});
