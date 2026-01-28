// ========================================
// Note Modal Management
// ========================================
import { state } from './state.js';
import { CalendarRenderer } from './calendar-renderer.js';
import { DataManager } from './data-manager.js';

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
