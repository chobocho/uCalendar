// ========================================
// Calendar Interaction
// ========================================
import { state } from './state.js';
import { CONSTANTS } from './constants.js';
import { CalendarRenderer } from './calendar-renderer.js';
import { NoteModal } from './note-modal.js';
import {Modal} from "./modal";

export const CalendarInteraction = {
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
    },

    handleCanvasContextMenu(e) {
        e.preventDefault();

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
            this.copyDayNotesToClipboard(clickedDay);
        }
    },

    copyDayNotesToClipboard(day) {
        const dateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayNotes = state.notesData.filter(n => n.date === dateStr);

        if (dayNotes.length === 0) {
            Modal.showMessage("알림", '해당 날짜에 일정이 없습니다.');
            return;
        }

        const notesText = `${dateStr}\n${dayNotes.map(note => note.content).join('\n')}`;

        navigator.clipboard.writeText(notesText).then(() => {
            Modal.showMessage("알림", `${dateStr}\n${dayNotes.length}개의 일정을 클립보드에 복사했습니다.`);
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            Modal.showMessage("알림", '클립보드 복사에 실패했습니다.');
        });
    }
};

window.changeMonth = (delta) => CalendarInteraction.changeMonth(delta);
window.backToThisMonth = () => CalendarInteraction.backToThisMonth();
