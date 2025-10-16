// Verbose logging utility for content script
const LOG_PREFIX = '[CanvasFilter:Content]';

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${LOG_PREFIX} [${level.toUpperCase()}] ${message}`;
  
  if (data !== null) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
}

log('info', 'Content script initializing...');

let canvasFilterInstance = null;
let lastMenuRef = null;

const ROOT_ID = 'canvas-filter-root';

function getOrCreateRoot(menu) {
  let root = menu.querySelector(`#${ROOT_ID}`);
  if (!root) {
    root = document.createElement('span'); // span to play nice with Canvas layout
    root.id = ROOT_ID;
    root.style.display = 'inline-flex';
    root.style.gap = '8px';
    menu.appendChild(root);
  } else {
    // If Canvas nuked children, we'll rebuild them below
  }
  return root;
}

function injectPageHook() {
  log('info', 'Starting injection of page hook script');
  
  try {
    const url = (typeof browser !== 'undefined'
      ? browser.runtime.getURL('inpage-router-hook.js')
      : chrome.runtime.getURL('inpage-router-hook.js'));

    log('info', 'Generated script URL', { url, browserType: typeof browser !== 'undefined' ? 'browser' : 'chrome' });

    const s = document.createElement('script');
    s.src = url;
    
    s.onload = () => {
      log('info', 'Page hook script loaded successfully, removing script element');
      s.remove();
    };
    
    s.onerror = (error) => {
      log('error', 'Failed to load inpage-router-hook.js', { 
        error: error.message || 'Unknown error',
        url,
        readyState: document.readyState
      });
      console.error('Canvas Filter: failed to load inpage-router-hook.js');
    };
    
    const targetElement = document.head || document.documentElement;
    log('info', 'Injecting script into target element', { 
      targetTagName: targetElement.tagName,
      hasHead: !!document.head 
    });
    
    targetElement.appendChild(s);
    log('info', 'Script element appended successfully');
    
  } catch (error) {
    log('error', 'Error during page hook injection', { error: error.message, stack: error.stack });
    throw error;
  }
}

function waitForElement(selector, { timeoutMs = 30000 } = {}) {
  log('info', 'Starting waitForElement', { selector, timeoutMs });
  
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) {
      log('info', 'Element found immediately', { selector, element: found });
      return resolve(found);
    }

    log('info', 'Element not found, setting up MutationObserver', { selector });
    
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { 
        log('info', 'Element found via MutationObserver', { selector, element: el });
        obs.disconnect(); 
        resolve(el); 
      }
    });
    
    const targetElement = document.documentElement || document;
    obs.observe(targetElement, { childList: true, subtree: true });
    log('info', 'MutationObserver started', { 
      selector, 
      targetElement: targetElement.tagName,
      config: { childList: true, subtree: true }
    });

    setTimeout(() => { 
      log('warn', 'Element wait timeout reached', { selector, timeoutMs });
      obs.disconnect(); 
      resolve(null); 
    }, timeoutMs);
  });
}

async function ensureMounted() {
  log('info', 'Starting ensureMounted function');
  const menu = await waitForElement('#GradeSummarySelectMenuGroup');
  if (!menu) return;

  // use our own root node as the source of truth
  const root = getOrCreateRoot(menu);
  const hasButton = !!root.querySelector('#canvas-filter-btn');

  if (!hasButton) {
    log('info', 'Mounting (button missing inside root)');

    // Clear anything stale in our root (in case of partial leftovers)
    root.innerHTML = '';

    // Build UI INTO our root (pass root down)
    canvasFilterInstance = new CanvasExerciseFilter({ mountInto: root });
  } else {
    log('debug', 'Already mounted (button present inside root)');
  }
}

// Keep-alive: if Canvas swaps or clears the menu, remount.
function startKeepAlive() {
  log('info', 'Starting keep-alive observer');
  
  const obs = new MutationObserver(() => {
    const menu = document.getElementById('GradeSummarySelectMenuGroup');
    const root = menu && menu.querySelector(`#${ROOT_ID}`);
    const hasButton = root && root.querySelector('#canvas-filter-btn');
    
    log('debug', 'Keep-alive check', { 
      menu: !!menu, 
      root: !!root,
      hasButton: !!hasButton 
    });
    
    if (menu && (!root || !hasButton)) {
      log('info', 'Menu needs remounting, queuing ensureMounted', { 
        hasRoot: !!root,
        hasButton: !!hasButton 
      });
      queueMicrotask(ensureMounted);
    }
  });
  
  const targetElement = document.documentElement || document;
  obs.observe(targetElement, { childList: true, subtree: true });
  log('info', 'Keep-alive observer started', { 
    targetElement: targetElement.tagName,
    config: { childList: true, subtree: true }
  });
}

// React to SPA route changes
function wireRouteListeners() {
  log('info', 'Setting up route change listeners');
  
  try {
    window.addEventListener('canvas-locationchange', (event) => {
      log('info', 'canvas-locationchange event received', { 
        url: event.detail?.url || location.href,
        detail: event.detail 
      });
      ensureMounted();
    });
    
    window.addEventListener('hashchange', (event) => {
      log('info', 'hashchange event received', { 
        oldURL: event.oldURL,
        newURL: event.newURL,
        currentURL: location.href 
      });
      ensureMounted();
    });

    // URL fallback
    let last = location.href;
    log('info', 'Setting up URL fallback observer', { initialURL: last });
    
    const urlObs = new MutationObserver(() => {
      const now = location.href;
      if (now !== last) { 
        log('info', 'URL changed via fallback observer', { 
          oldURL: last, 
          newURL: now 
        });
        last = now; 
        ensureMounted(); 
      }
    });
    
    const targetElement = document.documentElement || document;
    urlObs.observe(targetElement, { childList: true, subtree: true });
    log('info', 'URL fallback observer started', { 
      targetElement: targetElement.tagName,
      config: { childList: true, subtree: true }
    });

    // Also try on full load (helps hard refresh)
    window.addEventListener('load', (event) => {
      log('info', 'window load event received', { url: location.href });
      ensureMounted();
    });
    
    log('info', 'All route listeners set up successfully');
    
  } catch (error) {
    log('error', 'Error setting up route listeners', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Boot early so we survive refreshes/iframes
(function start() {
  log('info', 'Starting content script initialization', { 
    readyState: document.readyState,
    url: location.href,
    timestamp: Date.now()
  });
  
  try {
    log('info', 'Injecting page hook');
    injectPageHook();
    
    log('info', 'Wiring route listeners');
    wireRouteListeners();
    
    log('info', 'Starting keep-alive observer');
    startKeepAlive();

    if (document.readyState === 'loading') {
      log('info', 'Document still loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        log('info', 'DOMContentLoaded event fired');
        ensureMounted();
      });
    } else {
      log('info', 'Document already loaded, mounting immediately');
      ensureMounted();
    }
    
    log('info', 'Content script initialization complete');
    
  } catch (error) {
    log('error', 'Error during content script initialization', { 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
  }
})();

class CanvasExerciseFilter {
  constructor(opts = {}) {
    log('info', 'CanvasExerciseFilter constructor called', { opts });
    
    this.mountInto = opts.mountInto || document.getElementById('GradeSummarySelectMenuGroup');
    this.filterContainer = null;
    this.isVisible = false;
    this.searchBar = null;
    this.filters = {
      graded: false,
      ungraded: false,
      submitted: false,
      notSubmitted: false,
      subject: '',
      dueDate: '',
      searchTerm: ''
    };
    
    log('info', 'CanvasExerciseFilter initialized with default filters', { filters: this.filters, mountInto: this.mountInto });
    this.init();
  }

  init() {
    log('info', 'CanvasExerciseFilter init() called');
    try {
      // We already waited for the menu; now ensure mount root exists:
      if (!this.mountInto) {
        log('error', 'No mount container available');
        return;
      }
      this.createFilterUI();
      log('info', 'CanvasExerciseFilter init() completed successfully');
    } catch (error) {
      log('error', 'Error in CanvasExerciseFilter init()', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  createFilterUI() {
    log('info', 'Creating filter UI');
    
    const menuGroup = document.getElementById('GradeSummarySelectMenuGroup');
    if (!menuGroup || !this.mountInto) {
      log('error', 'Missing menuGroup or mountInto during UI creation');
      return;
    }
    
    log('info', 'Found menuGroup and mountInto for UI creation', { menuGroup, mountInto: this.mountInto });
    
    try {
      log('info', 'Creating search bar');
      this.createSearchBar(this.mountInto);
      
      log('info', 'Creating filter button');
      this.createFilterButton(this.mountInto);
      
      log('info', 'Creating filter panel');
      this.createFilterPanel(menuGroup); // panel is positioned relative to menuGroup
      
      log('info', 'Loading settings');
      this.loadSettings();
      
      log('info', 'Setting up Canvas integration');
      this.setupCanvasIntegration();
      
      log('info', 'Filter UI creation completed successfully');
    } catch (error) {
      log('error', 'Error creating filter UI', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  createSearchBar(parent) {
    log('info', 'Creating search bar', { parent });
    
    try {
      const searchContainer = document.createElement('span');
      searchContainer.dir = 'ltr';
      searchContainer.className = 'css-jwjvx8-view-flexItem'; // keep your styling class if you like
      
      const searchWrapper = document.createElement('div');
      searchWrapper.style.cssText = `
        display: flex;
        align-items: center;
        height: 36px;
        vertical-align: top;
      `;
      
      this.searchBar = document.createElement('input');
      this.searchBar.type = 'text';
      this.searchBar.placeholder = 'Zoek opdrachten...';
      this.searchBar.id = 'canvas-filter-search';
      this.searchBar.style.cssText = `
        margin-right: 12px;
        padding: 8px 12px;
        border: 1px solid #c7cdd1;
        border-radius: 4px;
        font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 14px;
        width: 200px;
        height: 36px;
        box-sizing: border-box;
        vertical-align: top;
      `;
      
      log('info', 'Search bar elements created', { 
        searchContainer, 
        searchWrapper, 
        searchBar: this.searchBar 
      });
      
      searchWrapper.appendChild(this.searchBar);
      searchContainer.appendChild(searchWrapper);

      // append straight into the known stable parent
      parent.appendChild(searchContainer);
      log('info', 'Search bar appended to parent');

      this.searchBar.addEventListener('input', () => {
        const searchValue = this.searchBar.value.toLowerCase();
        log('debug', 'Search input changed', { searchValue });
        this.filters.searchTerm = searchValue;
        this.applyFilters();
      });
      
      log('info', 'Search bar created successfully');
    } catch (error) {
      log('error', 'Error creating search bar', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  createFilterButton(parent) {
    log('info', 'Creating filter button', { parent });
    
    try {
      const buttonContainer = document.createElement('span');
      buttonContainer.dir = 'ltr';
      buttonContainer.className = 'css-jwjvx8-view-flexItem';
      
      const filterButton = document.createElement('button');
      filterButton.id = 'canvas-filter-btn';
      filterButton.title = 'Filter opdrachten';
      filterButton.type = 'button';
      filterButton.dir = 'ltr';
      filterButton.textContent = 'Filter';
      filterButton.style.cssText = `
        margin-right: 0;
        padding: 8px 16px;
        background: #008ee2;
        color: white;
        border: none;
        border-radius: 4px;
        font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        height: 36px;
        vertical-align: top;
      `;
      
      buttonContainer.appendChild(filterButton);
      parent.appendChild(buttonContainer);
      
      log('info', 'Filter button created and appended to parent');

      filterButton.addEventListener('click', () => this.toggleFilterPanel());
      
      log('info', 'Filter button created successfully');
    } catch (error) {
      log('error', 'Error creating filter button', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  createFilterPanel(menuGroup) {
    log('info', 'Creating filter panel', { menuGroup });
    
    try {
      this.filterContainer = document.createElement('div');
      this.filterContainer.id = 'canvas-filter-panel';
      this.filterContainer.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        width: 300px;
        background: white;
        border: 1px solid #c7cdd1;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 1000;
        display: none;
        margin-top: 8px;
      `;
      this.filterContainer.innerHTML = `
        <div class="filter-header">
          <h3>Filter Opdrachten</h3>
          <button id="close-filter" class="close-btn">×</button>
        </div>
        <div class="filter-content">
          <div class="filter-section">
            <h4>Status</h4>
            <label>
              <input type="checkbox" id="graded-filter"> Becijferd
            </label>
            <label>
              <input type="checkbox" id="ungraded-filter"> Niet becijferd
            </label>
            <label>
              <input type="checkbox" id="submitted-filter"> Ingeleverd
            </label>
            <label>
              <input type="checkbox" id="not-submitted-filter"> Niet ingeleverd
            </label>
          </div>
          <div class="filter-section">
            <h4>Vak</h4>
            <select id="subject-filter">
              <option value="">Alle vakken</option>
              <option value="Nederlands">Nederlands</option>
              <option value="Engels">Engels</option>
              <option value="Wiskunde">Wiskunde</option>
              <option value="Natuurkunde">Natuurkunde</option>
              <option value="Scheikunde">Scheikunde</option>
              <option value="Biologie">Biologie</option>
              <option value="Geschiedenis">Geschiedenis</option>
              <option value="Aardrijkskunde">Aardrijkskunde</option>
              <option value="Economie">Economie</option>
              <option value="Informatica">Informatica</option>
            </select>
          </div>
          <div class="filter-section">
            <h4>Inleverdatum</h4>
            <select id="due-date-filter">
              <option value="">Alle datums</option>
              <option value="this-week">Deze week</option>
              <option value="this-month">Deze maand</option>
              <option value="overdue">Te laat</option>
              <option value="upcoming">Komende week</option>
            </select>
          </div>
          <div class="filter-actions">
            <button id="apply-filter" class="apply-btn">Filter Toepassen</button>
            <button id="clear-filter" class="clear-btn">Filters Wissen</button>
          </div>
        </div>
      `;

      // attach panel to the stable parent
      if (menuGroup) {
        menuGroup.style.position = 'relative';
        menuGroup.appendChild(this.filterContainer);
        log('info', 'Filter panel appended to menuGroup');
      } else {
        document.body.appendChild(this.filterContainer);
        log('warn', 'MenuGroup not found, appended filter panel to body');
      }

      this.setupEventListeners();
      log('info', 'Filter panel created successfully');
    } catch (error) {
      log('error', 'Error creating filter panel', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  setupEventListeners() {
    const closeBtn = document.getElementById('close-filter');
    const applyBtn = document.getElementById('apply-filter');
    const clearBtn = document.getElementById('clear-filter');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hideFilterPanel());
    if (applyBtn) applyBtn.addEventListener('click', () => this.applyFilters());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearFilters());

    const inputs = this.filterContainer.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => this.applyFilters());
    });
  }

  setupCanvasIntegration() {
    const canvasApplyBtn = document.getElementById('apply_select_menus');
    if (canvasApplyBtn) {
      canvasApplyBtn.addEventListener('click', () => {
        setTimeout(() => {
          this.clearFilters();
        }, 1000);
      });
    }
  }

  // (rest of your class unchanged)
  toggleFilterPanel() { /* ...same as yours... */ this.filterContainer.style.display = 'block'; this.isVisible = true; }
  showFilterPanel() { this.filterContainer.style.display = 'block'; this.isVisible = true; }
  hideFilterPanel() { this.filterContainer.style.display = 'none'; this.isVisible = false; }
  applyFilters() { /* exactly your logic */ 
    log('info', 'Applying filters');
    
    try {
      const gradedElement = document.getElementById('graded-filter');
      const ungradedElement = document.getElementById('ungraded-filter');
      const submittedElement = document.getElementById('submitted-filter');
      const notSubmittedElement = document.getElementById('not-submitted-filter');
      const subjectElement = document.getElementById('subject-filter');
      const dueDateElement = document.getElementById('due-date-filter');
      
      this.filters.graded = gradedElement ? gradedElement.checked : false;
      this.filters.ungraded = ungradedElement ? ungradedElement.checked : false;
      this.filters.submitted = submittedElement ? submittedElement.checked : false;
      this.filters.notSubmitted = notSubmittedElement ? notSubmittedElement.checked : false;
      this.filters.subject = subjectElement ? subjectElement.value : '';
      this.filters.dueDate = dueDateElement ? dueDateElement.value : '';
      
      log('info', 'Filter values collected', { 
        filters: this.filters,
        elementsFound: {
          graded: !!gradedElement,
          ungraded: !!ungradedElement,
          submitted: !!submittedElement,
          notSubmitted: !!notSubmittedElement,
          subject: !!subjectElement,
          dueDate: !!dueDateElement
        }
      });
      
      this.saveSettings();
      this.filterCanvasAssignments();
      this.hideFilterPanel();
      
      log('info', 'Filters applied successfully');
    } catch (error) {
      log('error', 'Error applying filters', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  filterCanvasAssignments() { /* unchanged from yours */ 
    log('info', 'Starting to filter Canvas assignments', { filters: this.filters });
    
    try {
      const assignments = document.querySelectorAll('tr.student_assignment');
      log('info', `Found ${assignments.length} assignments to filter`);
      
      let visibleCount = 0;
      let hiddenCount = 0;
      
      assignments.forEach((assignment, index) => {
        let shouldShow = true;
        const originalShouldShow = shouldShow;
        
        if (this.filters.graded && !assignment.classList.contains('assignment_graded')) {
          shouldShow = false;
          log('debug', `Assignment ${index} hidden: not graded`, { assignment });
        }
        if (this.filters.ungraded && assignment.classList.contains('assignment_graded')) {
          shouldShow = false;
          log('debug', `Assignment ${index} hidden: is graded`, { assignment });
        }
        if (shouldShow && this.filters.submitted) {
          const submittedCell = assignment.querySelector('.submitted');
          if (!submittedCell || !submittedCell.textContent.includes('Ingeleverd')) {
            shouldShow = false;
            log('debug', `Assignment ${index} hidden: not submitted`, { assignment, submittedCell });
          }
        }
        if (shouldShow && this.filters.notSubmitted) {
          const submittedCell = assignment.querySelector('.submitted');
          if (submittedCell && submittedCell.textContent.includes('Ingeleverd')) {
            shouldShow = false;
            log('debug', `Assignment ${index} hidden: is submitted`, { assignment, submittedCell });
          }
        }
        if (shouldShow && this.filters.subject) {
          const contextDiv = assignment.querySelector('.context');
          if (!contextDiv || !contextDiv.textContent.includes(this.filters.subject)) {
            shouldShow = false;
            log('debug', `Assignment ${index} hidden: subject mismatch`, { 
              assignment, 
              contextDiv, 
              expectedSubject: this.filters.subject,
              actualContext: contextDiv?.textContent
            });
          }
        }
        if (shouldShow && this.filters.dueDate) {
          const dueDateCell = assignment.querySelector('.due');
          if (!dueDateCell || !this.matchesDueDateFilter(dueDateCell.textContent)) {
            shouldShow = false;
            log('debug', `Assignment ${index} hidden: due date mismatch`, { 
              assignment, 
              dueDateCell, 
              dueDateFilter: this.filters.dueDate,
              actualDueDate: dueDateCell?.textContent
            });
          }
        }
        if (shouldShow && this.filters.searchTerm) {
          const titleLink = assignment.querySelector('.title a');
          if (!titleLink || !titleLink.textContent.toLowerCase().includes(this.filters.searchTerm)) {
            shouldShow = false;
            log('debug', `Assignment ${index} hidden: search term mismatch`, { 
              assignment, 
              titleLink, 
              searchTerm: this.filters.searchTerm,
              actualTitle: titleLink?.textContent
            });
          }
        }
        
        this.toggleAssignmentVisibility(assignment, shouldShow);
        
        if (shouldShow) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
        
        if (originalShouldShow !== shouldShow) {
          log('debug', `Assignment ${index} visibility changed from ${originalShouldShow} to ${shouldShow}`);
        }
      });
      
      log('info', 'Assignment filtering completed', { 
        total: assignments.length,
        visible: visibleCount,
        hidden: hiddenCount
      });
      
      this.showFilterResults(assignments.length);
    } catch (error) {
      log('error', 'Error filtering Canvas assignments', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  matchesDueDateFilter(dueDateText) { /* unchanged */ 
    if (!this.filters.dueDate) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthMap = {
      'jan': 0, 'feb': 1, 'mrt': 2, 'apr': 3, 'mei': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'dec': 11
    };
    const match = dueDateText.match(/(\d+)\s+(\w+)/);
    if (!match) return true;
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = monthMap[monthName];
    if (month === undefined) return true;
    const dueDate = new Date(now.getFullYear(), month, day);
    switch (this.filters.dueDate) {
      case 'this-week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return dueDate >= weekStart && dueDate <= weekEnd;
      }
      case 'this-month':
        return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
      case 'overdue':
        return dueDate < today;
      case 'upcoming': {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return dueDate > today && dueDate <= nextWeek;
      }
      default:
        return true;
    }
  }
  toggleAssignmentVisibility(assignment, show) {
    if (show) {
      assignment.classList.remove('canvas-filtered-out');
      assignment.style.display = '';
    } else {
      assignment.classList.add('canvas-filtered-out');
      assignment.style.display = 'none';
    }
  }
  showFilterResults(totalAssignments) {
    let resultsDiv = document.getElementById('canvas-filter-results');
    if (!resultsDiv) {
      resultsDiv = document.createElement('div');
      resultsDiv.id = 'canvas-filter-results';
      resultsDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #008ee2;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
      `;
      document.body.appendChild(resultsDiv);
    }
    const visibleAssignments = document.querySelectorAll('tr.student_assignment:not(.canvas-filtered-out)').length;
    resultsDiv.textContent = `Toont ${visibleAssignments} van ${totalAssignments} opdrachten`;
    setTimeout(() => { resultsDiv.remove(); }, 3000);
  }
  clearFilters() {
    const graded = document.getElementById('graded-filter');
    const ungraded = document.getElementById('ungraded-filter');
    const submitted = document.getElementById('submitted-filter');
    const notSubmitted = document.getElementById('not-submitted-filter');
    const subject = document.getElementById('subject-filter');
    const dueDate = document.getElementById('due-date-filter');

    if (graded) graded.checked = false;
    if (ungraded) ungraded.checked = false;
    if (submitted) submitted.checked = false;
    if (notSubmitted) notSubmitted.checked = false;
    if (subject) subject.value = '';
    if (dueDate) dueDate.value = '';
    if (this.searchBar) this.searchBar.value = '';

    this.filters = {
      graded: false,
      ungraded: false,
      submitted: false,
      notSubmitted: false,
      subject: '',
      dueDate: '',
      searchTerm: ''
    };
    const assignments = document.querySelectorAll('tr.student_assignment');
    assignments.forEach(a => this.toggleAssignmentVisibility(a, true));
    this.saveSettings();
    this.hideFilterPanel();
  }
  saveSettings() {
    log('info', 'Saving filter settings');
    
    try {
      const settings = {
        graded: this.filters.graded,
        ungraded: this.filters.ungraded,
        submitted: this.filters.submitted,
        notSubmitted: this.filters.notSubmitted,
        subject: this.filters.subject,
        dueDate: this.filters.dueDate,
        searchTerm: this.searchBar ? this.searchBar.value : ''
      };
      
      log('info', 'Settings to save', { settings });
      
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      log('info', 'Using storage API', { browserType: typeof browser !== 'undefined' ? 'browser' : 'chrome' });
      
      storage.local.set({ canvasFilterSettings: settings }, () => {
        if (chrome.runtime.lastError) {
          log('error', 'Error saving settings', { error: chrome.runtime.lastError.message });
        } else {
          log('info', 'Settings saved successfully');
        }
      });
    } catch (error) {
      log('error', 'Error in saveSettings', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  loadSettings() {
    log('info', 'Loading filter settings');
    
    try {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      log('info', 'Using storage API for loading', { browserType: typeof browser !== 'undefined' ? 'browser' : 'chrome' });
      
      storage.local.get(['canvasFilterSettings'], (result) => {
        if (chrome.runtime.lastError) {
          log('error', 'Error loading settings', { error: chrome.runtime.lastError.message });
          return;
        }
        
        log('info', 'Storage result', { result });
        
        if (result && result.canvasFilterSettings) {
          const s = result.canvasFilterSettings;
          log('info', 'Found saved settings', { settings: s });
          
          const graded = document.getElementById('graded-filter');
          const ungraded = document.getElementById('ungraded-filter');
          const submitted = document.getElementById('submitted-filter');
          const notSubmitted = document.getElementById('not-submitted-filter');
          const subject = document.getElementById('subject-filter');
          const dueDate = document.getElementById('due-date-filter');

          const elementsFound = {
            graded: !!graded,
            ungraded: !!ungraded,
            submitted: !!submitted,
            notSubmitted: !!notSubmitted,
            subject: !!subject,
            dueDate: !!dueDate,
            searchBar: !!this.searchBar
          };
          
          log('info', 'Filter elements found', { elementsFound });

          if (graded) graded.checked = !!s.graded;
          if (ungraded) ungraded.checked = !!s.ungraded;
          if (submitted) submitted.checked = !!s.submitted;
          if (notSubmitted) notSubmitted.checked = !!s.notSubmitted;
          if (subject) subject.value = s.subject || '';
          if (dueDate) dueDate.value = s.dueDate || '';

          if (this.searchBar && s.searchTerm) {
            this.searchBar.value = s.searchTerm;
            this.filters.searchTerm = s.searchTerm.toLowerCase();
            log('info', 'Search bar value restored', { searchTerm: s.searchTerm });
          }
          
          log('info', 'Settings loaded and applied successfully');
        } else {
          log('info', 'No saved settings found, using defaults');
        }
      });
    } catch (error) {
      log('error', 'Error in loadSettings', { error: error.message, stack: error.stack });
      throw error;
    }
  }
}
