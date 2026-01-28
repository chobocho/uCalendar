// ========================================
// Main Application Entry Point
// ========================================

// Import all modules
import { state } from './state.js';
import { WailsRuntime } from './wails-runtime.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { CalendarRenderer } from './calendar-renderer.js';
import { CalendarInteraction } from './calendar-interaction.js';
import { TooltipManager } from './tooltip.js';
import { SearchPanel } from './search-panel.js';
import { NoteSearchUI } from './note-search.js';
import { DataManager } from './data-manager.js';
import './theme.js';
import './notepad.js';
import './keyboard-handler.js';
import './note-modal.js';
import './year-calendar.js';

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

function initApp() {
    CanvasRenderer.resize();
    SearchPanel.setup();
    NoteSearchUI.setup();
    DataManager.refreshAllNotes();
    CalendarRenderer.render();
}
