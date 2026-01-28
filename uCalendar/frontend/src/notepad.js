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
