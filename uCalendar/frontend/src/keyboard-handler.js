// ========================================
// Keyboard Handler
// ========================================
import { state } from './state.js';
import { SearchPanel } from './search-panel.js';
import { Notepad } from './notepad.js';
import { NoteModal } from './note-modal.js';
import { NoteSearchUI } from './note-search.js';

export const KeyboardHandler = {
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
        if (e.key === 'PageUp' || (e.altKey && (e.key === 'B' || e.key === 'b'))) {
            e.preventDefault();
            const noteEditor = document.getElementById('note-editor');
            noteEditor.scrollTop -= noteEditor.clientHeight;
            return;
        }

        if (e.key === 'PageDown' || (e.altKey && (e.key === 'F' || e.key === 'f'))) {
            e.preventDefault();
            const noteEditor = document.getElementById('note-editor');
            noteEditor.scrollTop += noteEditor.clientHeight;
            return;
        }

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

        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            Notepad.insertSymbol('√');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
            e.preventDefault();
            Notepad.insertSymbol('■');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
            e.preventDefault();
            Notepad.insertSymbol('□');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
            e.preventDefault();
            Notepad.insertSymbol('※');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
            e.preventDefault();
            Notepad.insertSymbol('✅');
            return;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
            e.preventDefault();
            Notepad.insertSymbol('❎');
            return;
        }
    }
};
