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

function showHelpPanel() {
    const helpText = `달력 사용
- 이전/다음 버튼: 월 이동
- 날짜 클릭: 일정 메모 열기
- 오늘 버튼: 이번 달로 이동
- 연간 보기: 연간 달력 열기

유용한 기능
- 일정이 많은 경우, 마우스를 날짜 위에 올리면 
  모든 일정을 볼 수 있습니다.
- ...로 축약된 일정 위에 마우스를 올려 보세요. 
- 🔵,💾,🅰️ 아이콘 위에 마우스를 올려두면, 
  원본 내용을 볼수 있습니다.

단축키
Ctrl + F - 일정 검색
Ctrl + N - 메모장 열기
Esc - 열린 패널 닫기

메모장 도움말은 메모장 상단의 ❓ 버튼에서 확인할 수 있습니다.`;

    window.go.main.App.ShowMessage('uCalendar 도움말', helpText);
}

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

window.showHelpPanel = () => showHelpPanel();
