(function() {
  'use strict';
  
  // Verbose logging utility for inpage-router-hook
  const LOG_PREFIX = '[CanvasFilter:InpageRouter]';
  
  function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ${LOG_PREFIX} [${level.toUpperCase()}] ${message}`;
    
    if (data !== null) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  }
  
  log('info', 'Inpage router hook initializing...');
  
  // Hook into history API to detect SPA navigation
  log('info', 'Storing original history methods');
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  function dispatchLocationChange() {
    const url = location.href;
    log('info', `Dispatching canvas-locationchange event for URL: ${url}`);
    
    try {
      const event = new CustomEvent('canvas-locationchange', {
        detail: { url: url }
      });
      window.dispatchEvent(event);
      log('info', 'Successfully dispatched canvas-locationchange event', { url });
    } catch (error) {
      log('error', 'Failed to dispatch canvas-locationchange event', { error: error.message, url });
    }
  }
  
  // Override pushState with logging
  history.pushState = function(state, title, url) {
    log('info', 'history.pushState called', { 
      state, 
      title, 
      url, 
      currentUrl: location.href 
    });
    
    try {
      originalPushState.apply(history, arguments);
      log('info', 'Original pushState executed successfully');
      dispatchLocationChange();
    } catch (error) {
      log('error', 'Error in pushState override', { error: error.message });
      throw error;
    }
  };
  
  // Override replaceState with logging
  history.replaceState = function(state, title, url) {
    log('info', 'history.replaceState called', { 
      state, 
      title, 
      url, 
      currentUrl: location.href 
    });
    
    try {
      originalReplaceState.apply(history, arguments);
      log('info', 'Original replaceState executed successfully');
      dispatchLocationChange();
    } catch (error) {
      log('error', 'Error in replaceState override', { error: error.message });
      throw error;
    }
  };
  
  // Listen for popstate (back/forward buttons) with logging
  function handlePopState(event) {
    log('info', 'popstate event detected', { 
      url: location.href, 
      state: event.state 
    });
    dispatchLocationChange();
  }
  
  window.addEventListener('popstate', handlePopState);
  log('info', 'Added popstate event listener');
  
  // Initial dispatch for current page
  log('info', 'Performing initial location change dispatch');
  dispatchLocationChange();
  
  log('info', 'Inpage router hook initialization complete');
})();