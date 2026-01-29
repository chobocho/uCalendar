// ========================================
// Notepad Management
// ========================================
import { state } from './state.js';
import { CONSTANTS } from './constants.js';
import { SearchPanel } from './search-panel.js';
import { KeyboardHandler } from './keyboard-handler.js';

export const Notepad = {
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

        noteEditor.oncontextmenu = (e) => this.handleContextMenu(e);

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
        await window.go.main.App.ShowMessage("메모 저장", msg);
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
    },

    handleContextMenu(e) {
        const noteEditor = document.getElementById('note-editor');
        if (!noteEditor) return;

        const start = noteEditor.selectionStart;
        const end = noteEditor.selectionEnd;

        // 선택된 텍스트가 있는지 확인
        if (start === end) return;

        const selectedText = noteEditor.value.substring(start, end).trim();

        // URL 패턴 확인 (http://, https://, www. 로 시작)
        const urlPattern = /^(https?:\/\/|www\.)/i;
        if (urlPattern.test(selectedText)) {
            e.preventDefault();

            let url = selectedText;
            // www로 시작하면 https:// 추가
            if (url.startsWith('www.')) {
                url = 'https://' + url;
            }

            window.go.main.App.OpenURL(url);
        }
    },

    showHelpPanel() {
        const helpText = `메모장 단축키:

Esc - 메모장 닫기

Alt + B - 한 페이지 앞으로
Alt + F - 한 페이지 뒤로

Ctrl + F - 검색 하기
Ctrl + <  - 이전 검색 결과로 이동
Ctrl + >  - 다음 검색 결과로 이동

Ctrl + L - 구분선 삽입

기호 삽입:
Ctrl + Shift + A - →
Ctrl + Shift + C - ✅ (체크마크)
Ctrl + Shift + I - ■ (체크박스)
Ctrl + Shift + O - □ (박스)
Ctrl + Shift + R - ※
Ctrl + Shift + X - ❎
Ctrl + Shift + Z - 🟩

URL을 드래그 후 우클릭하면 브라우저로 열립니다.
`;

        window.go.main.App.ShowMessage("메모장 도움말", helpText);
    }
};

window.openNotePanel = () => Notepad.open();
window.closeNotePanel = () => Notepad.close();
window.saveNotePad = () => Notepad.save();
window.saveNotePadWithNoti = () => Notepad.saveWithNotification();
window.showHelpPanel = () => Notepad.showHelpPanel();

