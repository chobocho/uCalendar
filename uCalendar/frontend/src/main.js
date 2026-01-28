// ========================================
// Constants
// ========================================
const CONSTANTS = {
    HEADER_HEIGHT: 30,
    CALENDAR_ROWS: 6,
    CALENDAR_COLS: 7,
    MAX_SHOW_NOTES: 3,
    MAX_DOT_NOTES: 12,
    MAX_ENGLISH_NOTES: 9,
    AUTO_SAVE_INTERVAL: 180000, // 3분
    WAILS_CHECK_INTERVAL: 100,
    SEARCH_MISS_DURATION: 450,
    DIVIDER_LENGTH: 50,
    DAY_NAMES: ['일', '월', '화', '수', '목', '금', '토'],
    DAY_NAMES_EN: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    NOTEPAD_KEY: 'NOTEPAD',
};

// ========================================
// State Management
// ========================================
const state = {
    // Calendar state
    currentDate: new Date(),
    get currentYear() { return this._year || this.currentDate.getFullYear(); },
    set currentYear(val) { this._year = val; },
    get currentMonth() { return this._month ?? this.currentDate.getMonth(); },
    set currentMonth(val) { this._month = val; },

    // Data state
    notesData: [],
    allNotesData: [],
    selectedDateStr: "",

    // Canvas state
    canvas: null,
    ctx: null,
    cellWidth: 0,
    cellHeight: 0,
    noteHoverTargets: [],

    // UI Elements
    elements: {
        noteTooltip: null,
        searchPanel: null,
        searchInput: null,
        searchResults: null,
        searchEmpty: null,
        noteSearchInput: null,
        noteSearchBtn: null,
        noteSearchNextBtn: null,
    },

    // Notepad state
    notepad: {
        lastSavedContent: '',
        isDirty: false,
        autoSaveTimer: null,
    },

    // Theme state
    isDarkTheme: false,
};

// ========================================
// Theme Management
// ========================================
const ThemeManager = {
    updateToggleIcon() {
        const toggleBtn = document.querySelector('button[onclick="toggleTheme()"]');
        if (!toggleBtn) return;

        toggleBtn.textContent = state.isDarkTheme ? '☀️' : '🌙';
        toggleBtn.title = state.isDarkTheme ? '라이트 테마로 변경' : '다크 테마로 변경';
    },

    toggle() {
        state.isDarkTheme = !state.isDarkTheme;

        if (state.isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        CanvasRenderer.draw();
        this.updateToggleIcon();
    },

    getColors() {
        return {
            baseText: state.isDarkTheme ? '#ffffff' : '#212121',
            noteText: state.isDarkTheme ? '#cccccc' : '#000000',
            dayHeader: state.isDarkTheme ? '#dddddd' : '#424242',
            sunday: state.isDarkTheme ? '#FF003C' : '#e53935',
            saturday: state.isDarkTheme ? '#00FFFF' : '#5c6bc0',
            border: state.isDarkTheme ? '#555555' : '#dddddd',
        };
    }
};

// ========================================
// Initialization
// ========================================
window.onload = () => {
    state.canvas = document.getElementById('calendarCanvas');
    state.ctx = state.canvas.getContext('2d');

    window.addEventListener('resize', () => CanvasRenderer.resize());
    state.canvas.addEventListener('click', (e) => CalendarInteraction.handleCanvasClick(e));
    state.canvas.addEventListener('mousemove', (e) => TooltipManager.handleHover(e));
    state.canvas.addEventListener('mouseleave', () => TooltipManager.hide());

    WailsRuntime.waitForReady(initApp);
};

const WailsRuntime = {
    isReady() {
        return window.go && window.go.main && window.go.main.App;
    },

    waitForReady(callback) {
        if (this.isReady()) {
            callback();
        } else {
            const checkWails = setInterval(() => {
                if (this.isReady()) {
                    clearInterval(checkWails);
                    callback();
                }
            }, CONSTANTS.WAILS_CHECK_INTERVAL);
        }
    }
};

function initApp() {
    CanvasRenderer.resize();
    SearchPanel.setup();
    NoteSearchUI.setup();
    DataManager.refreshAllNotes();
    CalendarRenderer.render();
}

// ========================================
// Data Management
// ========================================
const DataManager = {
    async refreshAllNotes() {
        if (!WailsRuntime.isReady()) return;
        try {
            const result = await window.go.main.App.GetAllNotes();
            state.allNotesData = Array.isArray(result) ? result : [];
        } catch (e) {
            state.allNotesData = [];
        }
        SearchPanel.updateResults();
    }
};

// ========================================
// Search Panel Management
// ========================================
const SearchPanel = {
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

// ========================================
// Notepad Management
// ========================================
const Notepad = {
    async open() {
        const notePanel = document.getElementById('note-panel');
        const noteEditor = document.getElementById('note-editor');
        const lineNumbers = document.getElementById('line-numbers');

        if (!notePanel || !noteEditor || !lineNumbers) return;

        SearchPanel.hide();

        // 데이터 로드
        try {
            const note = await window.go.main.App.GetNoteByDate(CONSTANTS.NOTEPAD_KEY);
            noteEditor.value = note.content || '';
        } catch (e) {
            console.error("Failed to load NOTEPAD:", e);
        }

        state.notepad.lastSavedContent = noteEditor.value;
        state.notepad.isDirty = false;

        notePanel.classList.remove('hidden');
        noteEditor.focus();

        this.updateLineNumbers();
        this.updateCharCount();

        noteEditor.oninput = () => {
            this.updateLineNumbers();
            this.updateCharCount();
            lineNumbers.scrollTop = noteEditor.scrollTop;
            state.notepad.isDirty = noteEditor.value !== state.notepad.lastSavedContent;
        };

        noteEditor.onscroll = () => {
            lineNumbers.scrollTop = noteEditor.scrollTop;
        };

        noteEditor.onkeydown = (e) => KeyboardHandler.handleNotepad(e);

        this.startAutoSave();
    },

    async close() {
        const notePanel = document.getElementById('note-panel');
        if (notePanel && !notePanel.classList.contains('hidden')) {
            await this.save();
            notePanel.classList.add('hidden');
            this.stopAutoSave();
        }
    },

    async save() {
        const noteEditor = document.getElementById('note-editor');
        if (!noteEditor) return "저장할 데이타가 없습니다.";

        const content = noteEditor.value;
        if (!state.notepad.isDirty || content === state.notepad.lastSavedContent) {
            return "변경 내용이 없습니다.";
        }

        let retMsg = "저장에 성공했습니다.";
        try {
            await window.go.main.App.SaveOrUpdateNoteByDate(CONSTANTS.NOTEPAD_KEY, content);
            state.notepad.lastSavedContent = content;
            state.notepad.isDirty = false;
            console.log("Notepad auto-saved");
        } catch (e) {
            console.error("Failed to save NOTEPAD:", e);
            retMsg = "저장에 실패했습니다.";
        }
        return retMsg;
    },

    async saveWithNotification() {
        const msg = await this.save();
        alert(msg);
    },

    startAutoSave() {
        if (state.notepad.autoSaveTimer) clearInterval(state.notepad.autoSaveTimer);
        state.notepad.autoSaveTimer = setInterval(() => this.save(), CONSTANTS.AUTO_SAVE_INTERVAL);
    },

    stopAutoSave() {
        if (state.notepad.autoSaveTimer) {
            clearInterval(state.notepad.autoSaveTimer);
            state.notepad.autoSaveTimer = null;
        }
    },

    insertDivider() {
        const noteEditor = document.getElementById('note-editor');
        if (!noteEditor) return;

        const divider = '─'.repeat(CONSTANTS.DIVIDER_LENGTH);
        const cursorPos = noteEditor.selectionStart;
        const textBefore = noteEditor.value.substring(0, cursorPos);
        const textAfter = noteEditor.value.substring(noteEditor.selectionEnd);

        const prefix = (textBefore.length > 0 && !textBefore.endsWith('\n')) ? '\n' : '';
        const suffix = (textAfter.length > 0 && !textAfter.startsWith('\n')) ? '\n' : '';

        const newText = textBefore + prefix + divider + suffix + textAfter;
        noteEditor.value = newText;

        const newCursorPos = cursorPos + prefix.length + divider.length + suffix.length;
        noteEditor.setSelectionRange(newCursorPos, newCursorPos);

        this.updateLineNumbers();
        this.updateCharCount();
        state.notepad.isDirty = noteEditor.value !== state.notepad.lastSavedContent;
    },

    insertSymbol(symbol) {
        const noteEditor = document.getElementById('note-editor');
        if (!noteEditor) return;

        const cursorPos = noteEditor.selectionStart;
        const textBefore = noteEditor.value.substring(0, cursorPos);
        const textAfter = noteEditor.value.substring(noteEditor.selectionEnd);

        const newText = textBefore + symbol + textAfter;
        noteEditor.value = newText;

        const newCursorPos = cursorPos + symbol.length;
        noteEditor.setSelectionRange(newCursorPos, newCursorPos);

        this.updateLineNumbers();
        this.updateCharCount();
        state.notepad.isDirty = noteEditor.value !== state.notepad.lastSavedContent;
    },

    updateCharCount() {
        const noteEditor = document.getElementById('note-editor');
        const charCountEl = document.getElementById('note-char-count');
        if (!noteEditor || !charCountEl) return;
        charCountEl.textContent = `글자수: ${noteEditor.value.length}`;
    },

    updateLineNumbers() {
        const noteEditor = document.getElementById('note-editor');
        const lineNumbers = document.getElementById('line-numbers');
        if (!noteEditor || !lineNumbers) return;

        const lines = noteEditor.value.split('\n');
        const lineCount = lines.length;
        let lineNumbersHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersHTML += `<div>${i}</div>`;
        }
        const scrollTop = noteEditor.scrollTop;
        lineNumbers.innerHTML = lineNumbersHTML;
        lineNumbers.scrollTop = scrollTop;
    }
};

window.openNotePanel = () => Notepad.open();
window.closeNotePanel = () => Notepad.close();
window.saveNotePad = () => Notepad.save();
window.saveNotePadWithNoti = () => Notepad.saveWithNotification();

// ========================================
// Keyboard Handler
// ========================================
const KeyboardHandler = {
    handleGlobal(e) {
        const isFindShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
        const isNotePadShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n';
        const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';

        if (isFindShortcut) {
            e.preventDefault();
            const notePanel = document.getElementById('note-panel');
            if (notePanel && !notePanel.classList.contains('hidden')) {
                if (state.elements.noteSearchInput) {
                    state.elements.noteSearchInput.focus();
                    state.elements.noteSearchInput.select();
                }
            } else {
                SearchPanel.show();
            }
            return;
        }

        if (isNotePadShortcut) {
            const notePanel = document.getElementById('note-panel');
            if (notePanel && !notePanel.classList.contains('hidden')) return;
            e.preventDefault();
            Notepad.open();
            return;
        }

        if (isSaveShortcut) {
            const notePanel = document.getElementById('note-panel');
            if (notePanel && !notePanel.classList.contains('hidden')) {
                e.preventDefault();
                Notepad.save();
                return;
            }
        }

        if (e.key === 'Escape') {
            SearchPanel.hide();
            NoteModal.close();
            Notepad.close();
            return;
        }
    },

    handleNotepad(e) {
        if (e.ctrlKey && (e.key === '6' || e.key === 'h' || e.key === 'H')) {
            e.preventDefault();
            const noteEditor = document.getElementById('note-editor');
            noteEditor.setSelectionRange(0, 0);
            noteEditor.scrollTop = 0;
            return;
        }

        if (e.ctrlKey && (e.key === '4' || e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            const noteEditor = document.getElementById('note-editor');
            const endPos = noteEditor.value.length;
            noteEditor.setSelectionRange(endPos, endPos);
            noteEditor.scrollTop = noteEditor.scrollHeight;
            return;
        }

        if (e.ctrlKey && (e.key === ',' || e.key === 'b' || e.key === 'B')) {
            e.preventDefault();
            NoteSearchUI.findPrev();
            return;
        }

        if (e.ctrlKey && (e.key === 'n' || e.key === 'N' || e.key === '.')) {
            e.preventDefault();
            NoteSearchUI.find({ startFromBeginning: false });
            return;
        }

        if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            Notepad.insertDivider();
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            Notepad.insertSymbol('→');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
            e.preventDefault();
            Notepad.insertSymbol('■');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
            e.preventDefault();
            Notepad.insertSymbol('□');
            return;
        }
    }
};

// ========================================
// Note Search UI
// ========================================
const NoteSearchUI = {
    setup() {
        state.elements.noteSearchInput = document.getElementById('noteSearchInput');
        state.elements.noteSearchBtn = document.getElementById('noteSearchBtn');
        state.elements.noteSearchNextBtn = document.getElementById('noteSearchNextBtn');

        if (!state.elements.noteSearchInput || !state.elements.noteSearchBtn ||
            !state.elements.noteSearchNextBtn) return;

        state.elements.noteSearchBtn.addEventListener('click', () => {
            this.find({ startFromBeginning: true });
        });

        state.elements.noteSearchNextBtn.addEventListener('click', () => {
            this.find({ startFromBeginning: false });
        });

        state.elements.noteSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.find({ startFromBeginning: false });
            }
        });
    },

    find({ startFromBeginning }) {
        const noteEditor = document.getElementById('note-editor');
        if (!noteEditor || !state.elements.noteSearchInput) return;

        const query = state.elements.noteSearchInput.value;
        if (!query) return;

        const content = noteEditor.value;
        const startIndex = startFromBeginning ? 0 : noteEditor.selectionEnd;
        let matchIndex = content.indexOf(query, startIndex);

        if (matchIndex === -1 && startIndex > 0) {
            matchIndex = content.indexOf(query, 0);
        }

        if (matchIndex === -1) {
            this.showMiss();
            return;
        }

        state.elements.noteSearchInput.classList.remove('note-search-miss');
        noteEditor.focus();
        noteEditor.setSelectionRange(matchIndex, matchIndex + query.length);
        this.scrollToIndex(noteEditor, matchIndex);
    },

    findPrev() {
        const noteEditor = document.getElementById('note-editor');
        if (!noteEditor || !state.elements.noteSearchInput) return;

        const query = state.elements.noteSearchInput.value;
        if (!query) return;

        const content = noteEditor.value;
        const startIndex = noteEditor.selectionStart - 1;

        if (startIndex < 0) return;

        let matchIndex = content.lastIndexOf(query, startIndex);

        if (matchIndex === -1) {
            matchIndex = content.lastIndexOf(query, content.length);
        }

        if (matchIndex === -1) {
            this.showMiss();
            return;
        }

        state.elements.noteSearchInput.classList.remove('note-search-miss');
        noteEditor.focus();
        noteEditor.setSelectionRange(matchIndex, matchIndex + query.length);
        this.scrollToIndex(noteEditor, matchIndex);
    },

    showMiss() {
        state.elements.noteSearchInput.classList.add('note-search-miss');
        setTimeout(() => {
            state.elements.noteSearchInput.classList.remove('note-search-miss');
        }, CONSTANTS.SEARCH_MISS_DURATION);
    },

    scrollToIndex(noteEditor, index) {
        const textBefore = noteEditor.value.slice(0, index);
        const lineIndex = textBefore.split('\n').length - 1;
        const style = window.getComputedStyle(noteEditor);
        const lineHeight = parseFloat(style.lineHeight) || 24;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const targetTop = (lineIndex * lineHeight) + paddingTop;
        const offset = noteEditor.clientHeight / 3;
        noteEditor.scrollTop = Math.max(0, targetTop - offset);
    }
};

// ========================================
// Calendar Rendering
// ========================================
const CalendarRenderer = {
    async render() {
        const ym = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}`;
        document.getElementById('current-date-display').innerText = ym;

        try {
            const result = await window.go.main.App.GetNotesByMonth(ym);
            state.notesData = result || [];
        } catch(e) {
            alert("DB 로드 실패: " + e);
            state.notesData = [];
        }

        CanvasRenderer.draw();
    }
};

window.toggleTheme = () => ThemeManager.toggle();

// ========================================
// Holidays Data
// ========================================
const HolidaysManager = {
    get(year) {
    const holidays = {};

    // (1) 양력 고정 공휴일
    const solarHolidays = [
        { date: '01-01', name: '신정' },
        { date: '03-01', name: '삼일절' },
        { date: '05-05', name: '어린이날' },
        { date: '06-06', name: '현충일' },
        { date: '08-15', name: '광복절' },
        { date: '10-03', name: '개천절' },
        { date: '10-09', name: '한글날' },
        { date: '12-25', name: '크리스마스' }
    ];

    solarHolidays.forEach(h => {
        holidays[`${year}-${h.date}`] = h.name;
    });

    // (2) 음력 공휴일 (설날, 추석, 부처님오신날 등)
    // ※ 순수 JS만으로는 음력 계산이 매우 복잡하므로 주요 연도만 하드코딩 예시로 넣었습니다.
    // 필요시 라이브러리를 쓰거나 API를 연동해야 정확합니다.
    const lunarData = {
        2024: {
            '02-09': '설날 연휴', '02-10': '설날', '02-11': '설날 연휴', '02-12': '대체공휴일',
            '04-10': '국회의원선거', '05-15': '부처님오신날', '05-06': '대체공휴일',
            '09-16': '추석 연휴', '09-17': '추석', '09-18': '추석 연휴'
        },
        2025: {
            '01-28': '설날 연휴', '01-29': '설날', '01-30': '설날 연휴', '03-03': '대체공휴일',
            '05-05': '부처님오신날', '05-06': '대체공휴일', // 어린이날과 겹침
            '10-05': '추석 연휴', '10-06': '추석', '10-07': '추석 연휴', '10-08': '대체공휴일'
        },
        2026: {
            '02-16': '설날 연휴', '02-17': '설날', '02-18': '설날 연휴',
            '05-24': '부처님오신날', '05-25': '대체공휴일',
            '09-24': '추석 연휴', '09-25': '추석', '09-26': '추석 연휴'
        },
        2027: {
            '02-06': '설날 연휴', '02-07': '설날', '02-08': '설날 연휴', '02-09': '대체공휴일', // 설날 일요일 겹침
            '05-13': '부처님오신날',
            '09-14': '추석 연휴', '09-15': '추석', '09-16': '추석 연휴'
        },
        2028: {
            '01-26': '설날 연휴', '01-27': '설날', '01-28': '설날 연휴',
            '05-02': '부처님오신날',
            '10-02': '추석 연휴', '10-03': '추석', '10-04': '추석 연휴', '10-05': '대체공휴일' // 개천절과 겹침
        },
        2029: {
            '02-12': '설날 연휴', '02-13': '설날', '02-14': '설날 연휴',
            '05-20': '부처님오신날', '05-21': '대체공휴일', // 일요일 겹침
            '09-21': '추석 연휴', '09-22': '추석', '09-23': '추석 연휴', '09-24': '대체공휴일' // 일요일 겹침
        },
        2030: {
            '02-02': '설날 연휴', '02-03': '설날', '02-04': '설날 연휴', '02-05': '대체공휴일', // 설날 일요일 겹침
            '05-09': '부처님오신날',
            '09-11': '추석 연휴', '09-12': '추석', '09-13': '추석 연휴'
        },
        2031: {
            '01-22': '설날 연휴', '01-23': '설날', '01-24': '설날 연휴',
            '05-28': '부처님오신날',
            '09-30': '추석 연휴', '10-01': '추석', '10-02': '추석 연휴'
        },
        2032: {
            '02-10': '설날 연휴', '02-11': '설날', '02-12': '설날 연휴',
            '05-16': '부처님오신날', '05-17': '대체공휴일', // 일요일 겹침
            '09-18': '추석 연휴', '09-19': '추석', '09-20': '추석 연휴', '09-21': '대체공휴일' // 추석 일요일 겹침
        },
        2033: {
            '01-30': '설날 연휴', '01-31': '설날', '02-01': '설날 연휴', '02-02': '대체공휴일', // 연휴 첫날 일요일 겹침
            '05-06': '부처님오신날',
            '10-06': '추석 연휴', '10-07': '추석', '10-08': '추석 연휴'
        },
        2034: {
            '02-18': '설날 연휴', '02-19': '설날', '02-20': '설날 연휴', '02-21': '대체공휴일', // 설날 일요일 겹침
            '05-25': '부처님오신날',
            '09-26': '추석 연휴', '09-27': '추석', '09-28': '추석 연휴'
        },
        2035: {
            '02-07': '설날 연휴', '02-08': '설날', '02-09': '설날 연휴',
            '05-15': '부처님오신날',
            '09-15': '추석 연휴', '09-16': '추석', '09-17': '추석 연휴', '09-18': '대체공휴일' // 추석 일요일 겹침
        },
        2036: {
            '01-27': '설날 연휴', '01-28': '설날', '01-29': '설날 연휴', '01-30': '대체공휴일', // 연휴 첫날 일요일 겹침
            '05-03': '부처님오신날', '05-06': '대체공휴일', // 토요일 겹침(5/5 어린이날과 연이어 대체공휴일 발생)
            '10-03': '추석 연휴', '10-04': '추석', '10-05': '추석 연휴',
            '10-06': '대체공휴일', '10-07': '대체공휴일' // 개천절+일요일 겹침으로 이틀 대체 휴무
        }
    };

    if (lunarData[year]) {
        Object.assign(holidays, (() => {
            const formatted = {};
            for (const [date, name] of Object.entries(lunarData[year])) {
                formatted[`${year}-${date}`] = name;
            }
            return formatted;
        })());
    }

        return holidays;
    }
};

// ========================================
// Canvas Rendering
// ========================================
const CanvasRenderer = {
    resize() {
        state.canvas.width = state.canvas.parentElement.clientWidth;
        state.canvas.height = state.canvas.parentElement.clientHeight;
        CalendarRenderer.render();
    },

    draw() {
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.noteHoverTargets = [];

        const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
        const lastDate = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
        const holidays = HolidaysManager.get(state.currentYear);

        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();

        state.cellWidth = state.canvas.width / CONSTANTS.CALENDAR_COLS;
        state.cellHeight = (state.canvas.height - CONSTANTS.HEADER_HEIGHT * 2) / CONSTANTS.CALENDAR_ROWS;

        const colors = ThemeManager.getColors();

        this.drawDayHeaders(colors);
        this.drawDates(firstDayIndex, lastDate, holidays, today, todayYear, todayMonth, todayDate, colors);
    },

    drawDayHeaders(colors) {
        state.ctx.font = 'bold 12px sans-serif';
        state.ctx.textBaseline = 'middle';

        for(let i = 0; i < CONSTANTS.CALENDAR_COLS; i++) {
            const x = i * state.cellWidth + state.cellWidth / 2;
            const y = CONSTANTS.HEADER_HEIGHT / 2;

            state.ctx.textAlign = 'center';
            if (i === 0) state.ctx.fillStyle = colors.sunday;
            else if (i === 6) state.ctx.fillStyle = colors.saturday;
            else state.ctx.fillStyle = colors.dayHeader;

            state.ctx.fillText(CONSTANTS.DAY_NAMES_EN[i], x, y);
        }
    },

    drawDates(firstDayIndex, lastDate, holidays, today, todayYear, todayMonth, todayDate, colors) {
        let currentDrawDate = 1;

        for (let i = 0; i < 42; i++) {
            if (i < firstDayIndex) continue;
            if (currentDrawDate > lastDate) break;

            const col = i % CONSTANTS.CALENDAR_COLS;
            const row = Math.floor(i / CONSTANTS.CALENDAR_COLS);

            const x = col * state.cellWidth;
            const y = CONSTANTS.HEADER_HEIGHT + row * state.cellHeight;
            const dateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(currentDrawDate).padStart(2, '0')}`;
            const holidayName = holidays[dateStr];

            this.drawDateNumber(currentDrawDate, x, y, col, holidayName, colors);
            let noteStartY = this.drawHoliday(holidayName, currentDrawDate, x, y, colors);
            noteStartY = this.drawNotes(dateStr, x, noteStartY, colors);
            this.drawCellBorder(x, y, state.currentYear, state.currentMonth, currentDrawDate, todayYear, todayMonth, todayDate, colors);

            currentDrawDate++;
        }
    },

    drawDateNumber(date, x, y, col, holidayName, colors) {
        state.ctx.font = '16px sans-serif';
        state.ctx.textAlign = 'left';
        state.ctx.textBaseline = 'top';

        if (holidayName) state.ctx.fillStyle = colors.sunday;
        else if (col === 0) state.ctx.fillStyle = colors.sunday;
        else if (col === 6) state.ctx.fillStyle = colors.saturday;
        else state.ctx.fillStyle = colors.baseText;

        state.ctx.fillText(date, x + 5, y + 5);
    },

    drawHoliday(holidayName, date, x, y, colors) {
        let noteStartY = y;
        if (holidayName) {
            state.ctx.font = '12px sans-serif';
            state.ctx.fillStyle = colors.sunday;
            const holidayText = this.fitText(holidayName, state.cellWidth - 10);
            const xOffset = date >= 10 ? 32 : 22;
            state.ctx.fillText(holidayText, x + xOffset, noteStartY + 7);
        }
        return y + 25;
    },

    drawNotes(dateStr, x, noteStartY, colors) {
        if (!Array.isArray(state.notesData)) return noteStartY;

        const notes = state.notesData
            .filter(n => n.date === dateStr && (!n.content.startsWith('#') && !n.content.startsWith('@')))
            .sort((a, b) => b.content.localeCompare(a.content));

        const english = state.notesData
            .filter(n => n.date === dateStr && (n.content.startsWith('#') || n.content.startsWith('@')))
            .sort((a, b) => b.content.localeCompare(a.content));

        state.ctx.font = '14px sans-serif';
        state.ctx.fillStyle = colors.noteText;

        this.drawRegularNotes(notes, x, noteStartY, colors);
        noteStartY += 15 * CONSTANTS.MAX_SHOW_NOTES + 15;
        this.drawEnglishNotes(english, x, noteStartY, colors);

        return noteStartY;
    },

    drawRegularNotes(notes, x, noteStartY, colors) {
        if (notes.length === 0) return;

        notes.forEach((note, idx) => {
            if (idx < CONSTANTS.MAX_SHOW_NOTES || (idx === CONSTANTS.MAX_SHOW_NOTES && notes.length === (CONSTANTS.MAX_SHOW_NOTES + 1))) {
                if (note.content) {
                    const { isImportant, content } = this.parseImportantMemo(note.content);
                    state.ctx.fillStyle = isImportant ? colors.sunday : colors.noteText;
                    const displayText = this.fitText(content, state.cellWidth - 10);
                    state.ctx.fillText(displayText, x + 5, noteStartY + (idx * 15));

                    if (note.content.length > 14) {
                        state.noteHoverTargets.push({
                            x: x + 3,
                            y: noteStartY + (idx * 15) - 2,
                            w: 15 * 9,
                            h: 14,
                            text: note.content
                        });
                    }
                }
            } else if (idx >= CONSTANTS.MAX_SHOW_NOTES && idx < CONSTANTS.MAX_DOT_NOTES) {
                state.ctx.fillStyle = colors.noteText;
                const dotX = x + (idx - CONSTANTS.MAX_SHOW_NOTES) * 15 + 5;
                const dotY = noteStartY + (CONSTANTS.MAX_SHOW_NOTES * 15);
                state.ctx.fillText(idx === 11 ? '⭕' : '🔵', dotX, dotY);

                if (note.content) {
                    state.noteHoverTargets.push({
                        x: dotX - 2,
                        y: dotY - 2,
                        w: 14,
                        h: 14,
                        text: note.content
                    });
                }
            }
        });
    },

    drawEnglishNotes(english, x, noteStartY, colors) {
        if (english.length === 0) return;

        state.ctx.fillStyle = colors.noteText;
        english.forEach((note, idx) => {
            if (idx < CONSTANTS.MAX_ENGLISH_NOTES) {
                const dotX = x + idx * 15 + 5;
                const dotY = noteStartY;
                const isCode = note.content.startsWith('@');
                state.ctx.fillText(idx === 8 ? '🔚' : (isCode ? '💾' : '🅰️'), dotX, dotY);

                if (note.content) {
                    state.noteHoverTargets.push({
                        x: dotX - 2,
                        y: dotY - 2,
                        w: 14,
                        h: 14,
                        text: note.content
                    });
                }
            }
        });
    },

    drawCellBorder(x, y, year, month, date, todayYear, todayMonth, todayDate, colors) {
        state.ctx.strokeStyle = colors.border;
        state.ctx.lineWidth = 1;
        state.ctx.strokeRect(x, y, state.cellWidth, state.cellHeight);

        if (year === todayYear && month === todayMonth && date === todayDate) {
            state.ctx.strokeStyle = '#2196F3';
            state.ctx.lineWidth = 2;
            state.ctx.strokeRect(x + 2, y + 2, state.cellWidth - 4, state.cellHeight - 4);
            state.ctx.strokeRect(x + 3, y + 3, state.cellWidth - 6, state.cellHeight - 6);
        }
    },

    fitText(text, maxWidth) {
        let width = state.ctx.measureText(text).width;
        const ellipsis = '...';
        const ellipsisWidth = state.ctx.measureText(ellipsis).width;

        if (width <= maxWidth) return text;

        let len = text.length;
        while (width >= maxWidth - ellipsisWidth && len-- > 0) {
            text = text.substring(0, len);
            width = state.ctx.measureText(text).width;
        }
        return text + ellipsis;
    },

    parseImportantMemo(content) {
        let isImportant = false;
        if (content.startsWith('!')) {
            isImportant = true;
            content = content.substring(1);
        }
        return { isImportant, content };
    }
};

// ========================================
// Tooltip Management
// ========================================
const TooltipManager = {
    ensure() {
        if (state.elements.noteTooltip) return;
        state.elements.noteTooltip = document.createElement('div');
        state.elements.noteTooltip.id = 'note-tooltip';
        state.elements.noteTooltip.className = 'hidden';
        document.body.appendChild(state.elements.noteTooltip);
    },

    show(text, clientX, clientY) {
        this.ensure();
        state.elements.noteTooltip.textContent = text;
        state.elements.noteTooltip.style.left = `${clientX + 12}px`;
        state.elements.noteTooltip.style.top = `${clientY + 12}px`;
        state.elements.noteTooltip.classList.remove('hidden');
    },

    hide() {
        if (!state.elements.noteTooltip) return;
        state.elements.noteTooltip.classList.add('hidden');
    },

    handleHover(e) {
        if (!state.noteHoverTargets.length) {
            this.hide();
            return;
        }

        const rect = state.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const target = state.noteHoverTargets.find(t =>
            mouseX >= t.x &&
            mouseX <= t.x + t.w &&
            mouseY >= t.y &&
            mouseY <= t.y + t.h
        );

        if (target) this.show(target.text, e.clientX, e.clientY);
        else this.hide();
    }
};

// --- 인터랙션 ---
window.showYearCalendar = () => {
    // 초기 연도 설정
    let yearViewYear = new Date().getFullYear();

    // 1. 기존 모달 제거 (중복 방지)
    const existingModal = document.getElementById('year-calendar-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 2. CSS 스타일 정의 (공휴일 스타일 및 버튼 스타일 추가)
    const styleId = 'calendar-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #year-calendar-modal {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.5); z-index: 9999;
                display: flex; justify-content: center; align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .calendar-container {
                background: white; width: 95%; max-width: 1100px; height: 85%;
                border-radius: 12px; display: flex; flex-direction: column;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden;
            }
            .calendar-header {
                padding: 15px 20px; background: #2c3e50; color: white;
                display: flex; justify-content: space-between; align-items: center;
                user-select: none;
            }
            .year-nav {
                display: flex; align-items: center; gap: 15px; font-size: 1.5rem; font-weight: bold;
            }
            .nav-btn {
                cursor: pointer; background: rgba(255,255,255,0.1); border: none;
                color: white; padding: 5px 12px; border-radius: 4px; font-size: 1rem;
                transition: background 0.2s;
            }
            .nav-btn:hover { background: rgba(255,255,255,0.3); }
            .year-close-btn {
                cursor: pointer; font-size: 28px; line-height: 1; opacity: 0.8;
            }
            .year-close-btn:hover { opacity: 1; }
            .calendar-body {
                padding: 20px; overflow-y: auto; flex: 1;
                display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px; background-color: #f8f9fa;
            }
            .month-card {
                background: white; border: 1px solid #eee; border-radius: 8px; 
                padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                cursor: pointer;
            }
            .month-title {
                text-align: center; font-weight: bold; margin-bottom: 10px;
                color: #2c3e50; font-size: 1.2em; border-bottom: 2px solid #f1f1f1; padding-bottom: 5px;
            }
            .days-grid {
                display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;
            }
            .day-name {
                font-size: 0.8em; font-weight: bold; color: #7f8c8d; margin-bottom: 5px;
            }
            .day-name.sun { color: #e74c3c; } /* 일요일 헤더 빨강 */
            .day-name.sat { color: #3498db; } /* 토요일 헤더 파랑 */
            
            .day-cell {
                font-size: 0.9em; padding: 6px 2px; border-radius: 4px; position: relative;
            }
            .day-cell:hover { background-color: #f1f1f1; }
            .day-cell.today {
                background-color: #2c3e50; color: white; font-weight: bold;
            }
            .day-cell.holiday {
                color: #e74c3c; font-weight: bold;
            }
            .day-cell.holiday-name {
                display: block; font-size: 0.4em; margin-top: -2px; 
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                color: #e74c3c;
            }
            .day-cell.sat { color: #3498db; }
            .day-cell.sun { color: #e74c3c; }
            .day-cell.empty { background: transparent; pointer-events: none; }
        `;
        document.head.appendChild(style);
    }

    // 4. 모달 기본 구조 생성
    const modal = document.createElement('div');
    modal.id = 'year-calendar-modal';

    // 배경 클릭 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const container = document.createElement('div');
    container.className = 'calendar-container';

    // 헤더 영역
    const header = document.createElement('div');
    header.className = 'calendar-header';

    // 연도 네비게이션
    const navDiv = document.createElement('div');
    navDiv.className = 'year-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn';
    prevBtn.innerText = '< 이전';

    const yearTitle = document.createElement('span');
    yearTitle.innerText = `${yearViewYear}년`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn';
    nextBtn.innerText = '다음 >';

    navDiv.appendChild(prevBtn);
    navDiv.appendChild(yearTitle);
    navDiv.appendChild(nextBtn);

    const closeBtn = document.createElement('div');
    closeBtn.className = 'year-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.remove();

    header.appendChild(navDiv);
    header.appendChild(closeBtn);

    // 달력 본문 영역
    const body = document.createElement('div');
    body.className = 'calendar-body';

    container.appendChild(header);
    container.appendChild(body);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // 5. 달력 렌더링 함수 (핵심 로직)
    const renderYearCalendar = (year) => {
        body.innerHTML = ''; // 기존 내용 지우기
        yearTitle.innerText = `${year}년`;

        const holidays = HolidaysManager.get(year);
        const dayNames = CONSTANTS.DAY_NAMES;

        // 1~12월 루프
        for (let m = 0; m < 12; m++) {
            const monthCard = document.createElement('div');
            monthCard.className = 'month-card';
            monthCard.addEventListener('click', () => {
                state.currentYear = year;
                state.currentMonth = m;
                modal.remove();
                CalendarRenderer.render();
            });

            const firstDay = new Date(year, m, 1);
            const lastDay = new Date(year, m + 1, 0);
            const startDayIdx = firstDay.getDay();
            const totalDays = lastDay.getDate();

            let html = `<div class="month-title">${m + 1}월</div>`;
            html += `<div class="days-grid">`;

            // 요일 헤더
            dayNames.forEach((day, idx) => {
                const className = idx === 0 ? 'sun' : (idx === 6 ? 'sat' : '');
                html += `<div class="day-name ${className}">${day}</div>`;
            });

            // 빈칸
            for (let i = 0; i < startDayIdx; i++) {
                html += `<div class="day-cell empty"></div>`;
            }

            // 날짜
            for (let d = 1; d <= totalDays; d++) {
                // 날짜 포맷 (YYYY-MM-DD)
                const monthStr = String(m + 1).padStart(2, '0');
                const dayStr = String(d).padStart(2, '0');
                const dateKey = `${year}-${monthStr}-${dayStr}`;

                const currentDayIdx = new Date(year, m, d).getDay(); // 0:일, 6:토

                // 오늘 날짜 확인
                const today = new Date();
                const isToday = (today.getFullYear() === year && today.getMonth() === m && today.getDate() === d);

                // 공휴일 확인
                const holidayName = holidays[dateKey];

                // 클래스 결정
                let classes = ['day-cell'];
                if (isToday) classes.push('today');
                if (holidayName) classes.push('holiday');
                else if (currentDayIdx === 0) classes.push('sun');
                else if (currentDayIdx === 6) classes.push('sat');

                html += `<div class="${classes.join(' ')}">
                    ${d}
                    ${holidayName ? `<span class="day-cell holiday-name">${holidayName}</span>` : ''}
                </div>`;
            }

            html += `</div>`;
            monthCard.innerHTML = html;
            body.appendChild(monthCard);
        }
    };

    // 6. 이벤트 연결 및 초기 실행
    prevBtn.addEventListener('click', () => {
        yearViewYear--;
        renderYearCalendar(yearViewYear);
    });

    nextBtn.addEventListener('click', () => {
        yearViewYear++;
        renderYearCalendar(yearViewYear);
    });

    // 최초 렌더링
    renderYearCalendar(yearViewYear);
};


// ========================================
// Calendar Interaction
// ========================================
const CalendarInteraction = {
    changeMonth(delta) {
        state.currentMonth += delta;
        if (state.currentMonth > 11) {
            state.currentMonth = 0;
            state.currentYear++;
        } else if (state.currentMonth < 0) {
            state.currentMonth = 11;
            state.currentYear--;
        }
        CalendarRenderer.render();
    },

    backToThisMonth() {
        const today = new Date();
        const thisYear = today.getFullYear();
        const thisMonth = today.getMonth();

        if (thisYear === state.currentYear && thisMonth === state.currentMonth) {
            return;
        }
        state.currentYear = thisYear;
        state.currentMonth = thisMonth;
        CalendarRenderer.render();
    },

    handleCanvasClick(e) {
        const rect = state.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (mouseY < CONSTANTS.HEADER_HEIGHT) return;

        const col = Math.floor(mouseX / state.cellWidth);
        const row = Math.floor((mouseY - CONSTANTS.HEADER_HEIGHT) / state.cellHeight);

        const firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
        const clickedDay = (row * CONSTANTS.CALENDAR_COLS) + col - firstDay + 1;
        const lastDate = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

        if (clickedDay >= 1 && clickedDay <= lastDate) {
            NoteModal.open(clickedDay);
        }
    }
};

window.changeMonth = (delta) => CalendarInteraction.changeMonth(delta);
window.backToThisMonth = () => CalendarInteraction.backToThisMonth();

// ========================================
// Note Modal Management
// ========================================
const NoteModal = {
    async open(day) {
        state.selectedDateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        document.getElementById('modalDateTitle').innerText = state.selectedDateStr;

        const notes = state.notesData
            .filter(n => n.date === state.selectedDateStr)
            .sort((a, b) => b.content.localeCompare(a.content));

        const listEl = document.getElementById('modalNoteList');
        listEl.innerHTML = '';

        notes.forEach(note => {
            const li = this.createNoteItem(note);
            listEl.appendChild(li);
        });

        document.getElementById('noteModal').classList.remove('hidden');
    },

    createNoteItem(note) {
        const li = document.createElement('li');
        li.className = 'note-item';

        const contentSpan = document.createElement('span');
        contentSpan.className = 'note-content';
        contentSpan.textContent = note.content;

        const checkBtn = this.createButton('check-btn', '✔️', '완료 표시', () =>
            this.checkNote(note.id, '✅', '\uD83D\uDEA9', note.content)
        );

        const cancelBtn = this.createButton('check-btn', '\uD83D\uDEA9', '취소 표시', () =>
            this.checkNote(note.id, '\uD83D\uDEA9', '✅', note.content)
        );

        const editBtn = this.createButton('edit-btn', '✒️', '노트 편집', () =>
            this.editNote(note.id, note.content)
        );

        const deleteBtn = this.createButton('del-btn', '\u274C', '노트 삭제', () =>
            this.deleteNote(note.id, note.content)
        );

        li.append(contentSpan, checkBtn, cancelBtn, editBtn, deleteBtn);
        return li;
    },

    createButton(className, text, title, onClick) {
        const btn = document.createElement('button');
        btn.className = className;
        btn.textContent = text;
        btn.title = title;
        btn.addEventListener('click', onClick);
        return btn;
    },

    close() {
        document.getElementById('noteModal').classList.add('hidden');
        document.getElementById('noteInput').value = '';
    },

    async checkNote(id, btnType, ignoreType, text) {
        if (text.startsWith(btnType)) {
            text = Array.from(text).slice(1).join('');
        } else if (text.startsWith(ignoreType)) {
            text = Array.from(text).slice(1).join('');
            text = btnType + text;
        } else {
            text = btnType + text;
        }

        await window.go.main.App.UpdateNote(id, text);
        await this.refreshAndReopen();
    },

    async editNote(id, text) {
        const nextContent = prompt('일정 수정 하기', text);
        if (nextContent === null || !nextContent.trim()) {
            alert('빈 일정으로 수정할 수 없습니다.');
            return;
        }

        await window.go.main.App.UpdateNote(id, nextContent);
        await this.refreshAndReopen();
    },

    async deleteNote(id, text) {
        if (!confirm(`${text}\n\n메모를 삭제 하시겠습니까?`)) return;

        await window.go.main.App.DeleteNote(id);
        await this.refreshAndReopen();
    },

    async saveNote() {
        const text = document.getElementById('noteInput').value;
        if (!text) return;

        await window.go.main.App.SaveNote(state.selectedDateStr, text);

        const day = parseInt(state.selectedDateStr.split('-')[2]);
        await CalendarRenderer.render();
        await DataManager.refreshAllNotes();
        this.open(day);
        document.getElementById('noteInput').value = '';
    },

    async refreshAndReopen() {
        const day = parseInt(state.selectedDateStr.split('-')[2]);
        await CalendarRenderer.render();
        await DataManager.refreshAllNotes();
        this.open(day);
    }
};

window.closeModal = () => NoteModal.close();
window.checkNote = (id, btnType, ignoreType, text) => NoteModal.checkNote(id, btnType, ignoreType, text);
window.editNote = (id, text) => NoteModal.editNote(id, text);
window.deleteNote = (id, text) => NoteModal.deleteNote(id, text);
window.saveNote = () => NoteModal.saveNote();
