function isCanvasGradesPage() {
  const gradesTable = document.querySelector('#grades_summary');
  const menuGroup = document.getElementById('GradeSummarySelectMenuGroup');
  const gradesPage = document.querySelector('.ic-Table--grades-summary-table');
  const isGradesPage = gradesTable && menuGroup && gradesPage;
  return isGradesPage;
}
if (!isCanvasGradesPage()) {
} else {
class CanvasExerciseFilter {
  constructor() {
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
    this.init();
  }
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.waitForCanvas());
    } else {
      this.waitForCanvas();
    }
  }
  waitForCanvas() {
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      const menuGroup = document.getElementById('GradeSummarySelectMenuGroup');
      if (menuGroup) {
        clearInterval(checkInterval);
        this.createFilterUI();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        this.createFilterUI();
      }
    }, 100);
  }
  createFilterUI() {
    const menuGroup = document.getElementById('GradeSummarySelectMenuGroup');
    if (!menuGroup) {
      console.error('Canvas Exercise Filter: No menu group found - this should not happen on grades page!');
      return;
    }
    this.createSearchBar(menuGroup);
    this.createFilterButton(menuGroup);
    this.createFilterPanel();
    this.loadSettings();
    this.setupCanvasIntegration();
  }
  createSearchBar(menuGroup) {
    const searchContainer = document.createElement('span');
    searchContainer.dir = 'ltr';
    searchContainer.className = 'css-jwjvx8-view-flexItem';
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
      border-radius: 3px;
      font-size: 14px;
      width: 200px;
      height: 36px;
      background: white;
      color: #2d3b45;
      font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      box-sizing: border-box;
      line-height: 1.2;
      vertical-align: top;
    `;
    searchWrapper.appendChild(this.searchBar);
    searchContainer.appendChild(searchWrapper);
    const flexContainer = menuGroup.querySelector('.css-owcg3p-view--flex-flex');
    if (flexContainer) {
      flexContainer.appendChild(searchContainer);
    }
    this.searchBar.addEventListener('input', () => {
      this.filters.searchTerm = this.searchBar.value.toLowerCase();
      this.applyFilters();
    });
  }
  createFilterButton(menuGroup) {
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
      border-radius: 3px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      height: 36px;
      font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      line-height: 1.2;
      box-sizing: border-box;
      transition: background-color 0.2s ease;
      vertical-align: top;
    `;
    buttonContainer.appendChild(filterButton);
    const flexContainer = menuGroup.querySelector('.css-owcg3p-view--flex-flex');
    if (flexContainer) {
      flexContainer.appendChild(buttonContainer);
    }
    filterButton.addEventListener('click', () => this.toggleFilterPanel());
  }
  createFilterPanel() {
    this.filterContainer = document.createElement('div');
    this.filterContainer.id = 'canvas-filter-panel';
    this.filterContainer.innerHTML = `
      <div class="filter-header">
        <h3>Filter Opdrachten</h3>
        <button id="close-filter" class="close-btn">×</button>
      </div>
      <div class="filter-content">
        <div class="filter-section">
          <h4>Status</h4>
          <label>
            <input type="checkbox" id="graded-filter"> Alleen beoordeelde opdrachten
          </label>
          <label>
            <input type="checkbox" id="ungraded-filter"> Alleen niet-beoordeelde opdrachten
          </label>
          <label>
            <input type="checkbox" id="submitted-filter"> Alleen ingeleverde opdrachten
          </label>
          <label>
            <input type="checkbox" id="not-submitted-filter"> Alleen niet-ingeleverde opdrachten
          </label>
        </div>
        <div class="filter-section">
          <h4>Vak</h4>
          <select id="subject-filter">
            <option value="">Alle vakken</option>
            <option value="SmartApp">SmartApp huiswerk</option>
            <option value="CSC">Cyber Security & Cloud (CSC)</option>
            <option value="PROG">Programming (PROG)</option>
            <option value="MOD">Modelling (MOD)</option>
          </select>
        </div>
        <div class="filter-section">
          <h4>Inleverdatum</h4>
          <select id="due-date-filter">
            <option value="">Alle datums</option>
            <option value="this-week">Deze week</option>
            <option value="this-month">Deze maand</option>
            <option value="overdue">Te laat</option>
            <option value="upcoming">Binnenkort</option>
          </select>
        </div>
        <div class="filter-actions">
          <button id="apply-filter" class="apply-btn">Filter Toepassen</button>
          <button id="clear-filter" class="clear-btn">Alles Wissen</button>
        </div>
      </div>
    `;
    const menuGroup = document.getElementById('GradeSummarySelectMenuGroup');
    if (menuGroup) {
      this.filterContainer.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        width: 320px;
        background: white;
        border: 1px solid #c7cdd1;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        display: none;
        font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
        margin-top: 8px;
      `;
      menuGroup.style.position = 'relative';
      menuGroup.appendChild(this.filterContainer);
    } else {
      this.filterContainer.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        width: 320px;
        background: white;
        border: 1px solid #c7cdd1;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        display: none;
        font-family: "Lato Extended", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      `;
      document.body.appendChild(this.filterContainer);
    }
    this.setupEventListeners();
  }
  setupEventListeners() {
    const closeBtn = document.getElementById('close-filter');
    const applyBtn = document.getElementById('apply-filter');
    const clearBtn = document.getElementById('clear-filter');
    closeBtn.addEventListener('click', () => this.hideFilterPanel());
    applyBtn.addEventListener('click', () => this.applyFilters());
    clearBtn.addEventListener('click', () => this.clearFilters());
    const inputs = this.filterContainer.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.saveSettings();
        this.applyFilters();
      });
    });
  }
  setupCanvasIntegration() {
    const canvasApplyBtn = document.getElementById('apply_select_menus');
    if (canvasApplyBtn) {
      canvasApplyBtn.addEventListener('click', () => {
        setTimeout(() => {
          this.clearFilters();
        }, 100);
      });
    }
  }
  toggleFilterPanel() {
    if (this.isVisible) {
      this.hideFilterPanel();
    } else {
      this.showFilterPanel();
    }
  }
  showFilterPanel() {
    this.filterContainer.style.display = 'block';
    this.isVisible = true;
  }
  hideFilterPanel() {
    this.filterContainer.style.display = 'none';
    this.isVisible = false;
  }
  applyFilters() {
    this.filters.graded = document.getElementById('graded-filter').checked;
    this.filters.ungraded = document.getElementById('ungraded-filter').checked;
    this.filters.submitted = document.getElementById('submitted-filter').checked;
    this.filters.notSubmitted = document.getElementById('not-submitted-filter').checked;
    this.filters.subject = document.getElementById('subject-filter').value;
    this.filters.dueDate = document.getElementById('due-date-filter').value;
    this.saveSettings();
    this.filterCanvasAssignments();
    this.hideFilterPanel();
  }
  filterCanvasAssignments() {
    const assignments = document.querySelectorAll('tr.student_assignment');
    assignments.forEach(assignment => {
      let shouldShow = true;
      if (this.filters.graded && !assignment.classList.contains('assignment_graded')) {
        shouldShow = false;
      }
      if (this.filters.ungraded && assignment.classList.contains('assignment_graded')) {
        shouldShow = false;
      }
      if (shouldShow && this.filters.submitted) {
        const submittedCell = assignment.querySelector('.submitted');
        if (!submittedCell || !submittedCell.textContent.trim()) {
          shouldShow = false;
        }
      }
      if (shouldShow && this.filters.notSubmitted) {
        const submittedCell = assignment.querySelector('.submitted');
        if (submittedCell && submittedCell.textContent.trim()) {
          shouldShow = false;
        }
      }
      if (shouldShow && this.filters.subject) {
        const contextDiv = assignment.querySelector('.context');
        if (!contextDiv || !contextDiv.textContent.includes(this.filters.subject)) {
          shouldShow = false;
        }
      }
      if (shouldShow && this.filters.dueDate) {
        const dueDateCell = assignment.querySelector('.due');
        if (dueDateCell && !this.matchesDueDateFilter(dueDateCell.textContent.trim())) {
          shouldShow = false;
        }
      }
      if (shouldShow && this.filters.searchTerm) {
        const titleLink = assignment.querySelector('.title a');
        if (!titleLink || !titleLink.textContent.toLowerCase().includes(this.filters.searchTerm)) {
          shouldShow = false;
        }
      }
      this.toggleAssignmentVisibility(assignment, shouldShow);
    });
    this.showFilterResults(assignments.length);
  }
  matchesDueDateFilter(dueDateText) {
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
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return dueDate >= weekStart && dueDate <= weekEnd;
      case 'this-month':
        return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
      case 'overdue':
        return dueDate < today;
      case 'upcoming':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return dueDate > today && dueDate <= nextWeek;
      default:
        return true;
    }
  }
  toggleAssignmentVisibility(assignment, show) {
    if (show) {
      assignment.style.display = '';
      assignment.classList.remove('canvas-filtered-out');
    } else {
      assignment.style.display = 'none';
      assignment.classList.add('canvas-filtered-out');
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
        left: 20px;
        background: #28a745;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 10002;
        font-size: 14px;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(resultsDiv);
    }
    const visibleAssignments = document.querySelectorAll('tr.student_assignment:not(.canvas-filtered-out)').length;
    resultsDiv.textContent = `Toont ${visibleAssignments} van ${totalAssignments} opdrachten`;
    setTimeout(() => {
      if (resultsDiv.parentNode) {
        resultsDiv.parentNode.removeChild(resultsDiv);
      }
    }, 3000);
  }
  clearFilters() {
    document.getElementById('graded-filter').checked = false;
    document.getElementById('ungraded-filter').checked = false;
    document.getElementById('submitted-filter').checked = false;
    document.getElementById('not-submitted-filter').checked = false;
    document.getElementById('subject-filter').value = '';
    document.getElementById('due-date-filter').value = '';
    if (this.searchBar) {
      this.searchBar.value = '';
    }
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
    assignments.forEach(assignment => {
      this.toggleAssignmentVisibility(assignment, true);
    });
    this.saveSettings();
    this.hideFilterPanel();
  }
  saveSettings() {
    const settings = {
      graded: document.getElementById('graded-filter').checked,
      ungraded: document.getElementById('ungraded-filter').checked,
      submitted: document.getElementById('submitted-filter').checked,
      notSubmitted: document.getElementById('not-submitted-filter').checked,
      subject: document.getElementById('subject-filter').value,
      dueDate: document.getElementById('due-date-filter').value,
      searchTerm: this.searchBar ? this.searchBar.value : ''
    };
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
    storage.local.set({ canvasFilterSettings: settings });
  }
  loadSettings() {
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
    storage.local.get(['canvasFilterSettings'], (result) => {
      if (result.canvasFilterSettings) {
        const settings = result.canvasFilterSettings;
        document.getElementById('graded-filter').checked = settings.graded || false;
        document.getElementById('ungraded-filter').checked = settings.ungraded || false;
        document.getElementById('submitted-filter').checked = settings.submitted || false;
        document.getElementById('not-submitted-filter').checked = settings.notSubmitted || false;
        document.getElementById('subject-filter').value = settings.subject || '';
        document.getElementById('due-date-filter').value = settings.dueDate || '';
        if (this.searchBar && settings.searchTerm) {
          this.searchBar.value = settings.searchTerm;
          this.filters.searchTerm = settings.searchTerm.toLowerCase();
        }
      }
    });
  }
}
const canvasExerciseFilter = new CanvasExerciseFilter();
} 
