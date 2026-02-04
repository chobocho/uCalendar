// ========================================
// Tooltip Management
// ========================================
import { state } from './state.js';

export const TooltipManager = {
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
        state.elements.noteTooltip.classList.remove('hidden');

        // 툴팁 크기 측정을 위해 먼저 표시
        let tooltipLeft = clientX + 12;
        let tooltipTop = clientY + 12;
        state.elements.noteTooltip.style.left = `${tooltipLeft}px`;
        state.elements.noteTooltip.style.top = `${tooltipTop}px`;

        // 툴팁이 윈도우 오른쪽을 벗어나는지 확인
        const tooltipRect = state.elements.noteTooltip.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 오른쪽 경계 체크
        if (tooltipRect.right > windowWidth) {
            tooltipLeft = clientX - tooltipRect.width - 12;
        }

        // 왼쪽 경계 체크 (음수 방지)
        if (tooltipLeft < 0) {
            tooltipLeft = 5;
        }

        // 하단 경계 체크
        if (tooltipRect.bottom > windowHeight) {
            tooltipTop = clientY - tooltipRect.height - 12;
        }

        // 상단 경계 체크 (음수 방지)
        if (tooltipTop < 0) {
            tooltipTop = 5;
        }

        state.elements.noteTooltip.style.left = `${tooltipLeft}px`;
        state.elements.noteTooltip.style.top = `${tooltipTop}px`;
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
