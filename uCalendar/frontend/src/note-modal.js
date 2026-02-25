// ========================================
// Note Modal Management
// ========================================
import { state } from './state.js';
import { CalendarRenderer } from './calendar-renderer.js';
import { DataManager } from './data-manager.js';

// Prevent PageUp/PageDown default behavior in textareas (register once)
const preventPageNav = (e) => {
    if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
    }
};

const initKeydownGuards = () => {
    const noteInputEl = document.getElementById('noteInput');
    if (noteInputEl) {
        noteInputEl.addEventListener('keydown', preventPageNav, { passive: false });
    }
    const editNoteContentEl = document.getElementById('editNoteContent');
    if (editNoteContentEl) {
        editNoteContentEl.addEventListener('keydown', preventPageNav, { passive: false });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKeydownGuards, { once: true });
} else {
    initKeydownGuards();
}

export const NoteModal = {
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
        document.getElementById('noteInput').focus();
    },

    createNoteItem(note) {
        const li = document.createElement('li');
        li.className = 'note-item';

        const contentSpan = document.createElement('span');
        contentSpan.className = 'note-content';
        contentSpan.textContent = note.content;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'note-item-actions';

        const checkBtn = this.createButton('check-btn', '✔️', '완료 표시', () =>
            this.checkNote(note.id, '✅', '\uD83D\uDEA9', note.content)
        );

        const cancelBtn = this.createButton('check-btn', '\uD83D\uDEA9', '취소 표시', () =>
            this.checkNote(note.id, '\uD83D\uDEA9', '✅', note.content)
        );

        const editBtn = this.createButton('edit-btn', '✒️', '노트 편집', () =>
            this.openEditModal(note.id, note.date, note.content)
        );

        const deleteBtn = this.createButton('del-btn', '\u274C', '노트 삭제', () =>
            this.deleteNote(note.id, note.content)
        );

        actionsDiv.append(checkBtn, cancelBtn, editBtn, deleteBtn);
        li.append(contentSpan, actionsDiv);
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

    openEditModal(id, date, content) {
        state.editingNoteId = id;
        state.editingNoteDate = date;

        document.getElementById('editNoteDate').value = date;
        document.getElementById('editNoteContent').value = content;
        document.getElementById('editNoteModal').classList.remove('hidden');
        document.getElementById('editNoteContent').focus();
    },

    closeEditModal() {
        document.getElementById('editNoteModal').classList.add('hidden');
        document.getElementById('editNoteDate').value = '';
        document.getElementById('editNoteContent').value = '';
        state.editingNoteId = null;
        state.editingNoteDate = null;
    },

    async confirmEditNote() {
        const newDate = document.getElementById('editNoteDate').value;
        const newContent = document.getElementById('editNoteContent').value.trim();

        if (!newContent) {
            alert('빈 일정으로 수정할 수 없습니다.');
            return;
        }

        const id = state.editingNoteId;
        const oldDate = state.editingNoteDate;

        // 날짜가 변경된 경우
        if (newDate !== oldDate) {
            // 기존 노트 삭제
            await window.go.main.App.DeleteNote(id);
            // 새로운 날짜에 노트 저장
            await window.go.main.App.SaveNote(newDate, newContent);
        } else {
            // 날짜가 같으면 내용만 업데이트
            await window.go.main.App.UpdateNote(id, newContent);
        }

        this.closeEditModal();

        // 변경된 날짜의 일자 추출
        const day = parseInt(newDate.split('-')[2]);
        const [year, month] = newDate.split('-').map(Number);

        // 현재 보고 있는 달력과 다른 달이면 이동
        if (year !== state.currentYear || month !== state.currentMonth + 1) {
            state.currentYear = year;
            state.currentMonth = month - 1;
        }

        await CalendarRenderer.render();
        await DataManager.refreshAllNotes();
        this.open(day);
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
window.closeEditModal = () => NoteModal.closeEditModal();
window.confirmEditNote = () => NoteModal.confirmEditNote();
window.checkNote = (id, btnType, ignoreType, text) => NoteModal.checkNote(id, btnType, ignoreType, text);
window.deleteNote = (id, text) => NoteModal.deleteNote(id, text);
window.saveNote = () => NoteModal.saveNote();
