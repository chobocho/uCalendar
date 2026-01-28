// ========================================
// Calendar Rendering
// ========================================
import { state } from './state.js';
import { CanvasRenderer } from './canvas-renderer.js';

export const CalendarRenderer = {
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
