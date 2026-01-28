// ========================================
// Search Panel Management
// ========================================
import { state } from './state.js';
import { CONSTANTS } from './constants.js';
import { CalendarRenderer } from './calendar-renderer.js';
import { KeyboardHandler } from './keyboard-handler.js';

export const SearchPanel = {
    setup() {
        state.elements.searchPanel = document.getElementById('search-panel');
        state.elements.searchInput = document.getElementById('searchInput');
        state.elements.searchResults = document.getElementById('searchResults');
        state.elements.searchEmpty = document.getElementById('searchEmpty');

        if (!state.elements.searchPanel || !state.elements.searchInput ||
            !state.elements.searchResults || !state.elements.searchEmpty) return;

        this.setupEventListeners();
    },

    setupEventListeners() {
        document.addEventListener('keydown', (e) => KeyboardHandler.handleGlobal(e));
        state.elements.searchInput.addEventListener('input', () => this.updateResults());
        state.elements.searchResults.addEventListener('click', (e) => this.handleResultClick(e));

        const closeBtn = document.getElementById('searchCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    },

    show() {
        if (!state.elements.searchPanel) return;
        state.elements.searchPanel.classList.remove('hidden');
        state.elements.searchInput.focus();
        state.elements.searchInput.select();
        this.updateResults();
    },

    hide() {
        if (!state.elements.searchPanel) return;
        state.elements.searchPanel.classList.add('hidden');
    },

    handleResultClick(e) {
        const item = e.target.closest('li[data-date]');
        if (!item) return;

        const dateStr = item.dataset.date;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return;

        state.currentYear = parseInt(parts[0], 10);
        state.currentMonth = parseInt(parts[1], 10) - 1;
        CalendarRenderer.render();
        this.hide();
    },

    updateResults() {
        if (!state.elements.searchInput || !state.elements.searchResults || !state.elements.searchEmpty) return;

        const query = state.elements.searchInput.value.trim().toLowerCase();
        if (!query) {
            this.renderEmpty('검색어를 넣어 주세요');
            return;
        }

        const results = state.allNotesData
            .filter((note) => note.date !== CONSTANTS.NOTEPAD_KEY)
            .filter((note) => (note.content || '').toLowerCase().includes(query))
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.id - b.id);

        if (!results.length) {
            this.renderEmpty('일치하는 일정이 없습니다.');
            return;
        }

        state.elements.searchResults.innerHTML = '';
        state.elements.searchEmpty.classList.add('hidden');

        results.forEach((note) => {
            const li = document.createElement('li');
            li.className = 'search-result-item';
            li.dataset.date = note.date;

            const dateSpan = document.createElement('span');
            dateSpan.className = 'search-result-date';
            dateSpan.textContent = note.date;

            const contentSpan = document.createElement('span');
            contentSpan.className = 'search-result-content';
            const content = (note.content && note.content.startsWith('!')) ? note.content.substring(1) : note.content;
            contentSpan.textContent = content || '';

            li.append(dateSpan, contentSpan);
            state.elements.searchResults.appendChild(li);
        });
    },

    renderEmpty(message) {
        state.elements.searchResults.innerHTML = '';
        state.elements.searchEmpty.textContent = message;
        state.elements.searchEmpty.classList.remove('hidden');
    }
};

window.showSearchPanel = () => SearchPanel.show();
