// ========================================
// Canvas Rendering
// ========================================
import { state } from './state.js';
import { CONSTANTS } from './constants.js';
import { ThemeManager } from './theme.js';
import { HolidaysManager } from './holidays.js';
import { CalendarRenderer } from './calendar-renderer.js';

export const CanvasRenderer = {
    resize() {
        state.canvas.width = state.canvas.parentElement.clientWidth;
        state.canvas.height = state.canvas.parentElement.clientHeight;
        CalendarRenderer.render();
    },

    draw() {
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.noteHoverTargets = [];

        const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
        const lastDate = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
        const holidays = HolidaysManager.get(state.currentYear);

        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();

        state.cellWidth = state.canvas.width / CONSTANTS.CALENDAR_COLS;
        state.cellHeight = (state.canvas.height - CONSTANTS.HEADER_HEIGHT * 2) / CONSTANTS.CALENDAR_ROWS;

        const colors = ThemeManager.getColors();

        this.drawDayHeaders(colors);
        this.drawDates(firstDayIndex, lastDate, holidays, today, todayYear, todayMonth, todayDate, colors);
    },

    drawDayHeaders(colors) {
        state.ctx.font = 'bold 12px sans-serif';
        state.ctx.textBaseline = 'middle';

        for(let i = 0; i < CONSTANTS.CALENDAR_COLS; i++) {
            const x = i * state.cellWidth + state.cellWidth / 2;
            const y = CONSTANTS.HEADER_HEIGHT / 2;

            state.ctx.textAlign = 'center';
            if (i === 0) state.ctx.fillStyle = colors.sunday;
            else if (i === 6) state.ctx.fillStyle = colors.saturday;
            else state.ctx.fillStyle = colors.dayHeader;

            state.ctx.fillText(CONSTANTS.DAY_NAMES_EN[i], x, y);
        }
    },

    drawDates(firstDayIndex, lastDate, holidays, today, todayYear, todayMonth, todayDate, colors) {
        let currentDrawDate = 1;

        for (let i = 0; i < 42; i++) {
            if (i < firstDayIndex) continue;
            if (currentDrawDate > lastDate) break;

            const col = i % CONSTANTS.CALENDAR_COLS;
            const row = Math.floor(i / CONSTANTS.CALENDAR_COLS);

            const x = col * state.cellWidth;
            const y = CONSTANTS.HEADER_HEIGHT + row * state.cellHeight;
            const dateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(currentDrawDate).padStart(2, '0')}`;
            const holidayName = holidays[dateStr];

            this.drawDateNumber(currentDrawDate, x, y, col, holidayName, colors);
            let noteStartY = this.drawHoliday(holidayName, currentDrawDate, x, y, colors);
            noteStartY = this.drawNotes(dateStr, x, noteStartY, colors);
            this.drawCellBorder(x, y, state.currentYear, state.currentMonth, currentDrawDate, todayYear, todayMonth, todayDate, colors);

            if (col === 1) {
                const date = new Date(state.currentYear, state.currentMonth, currentDrawDate);
                const weekNum = getISO8601WeekNumber(date);
                state.ctx.font = '10px sans-serif';
                state.ctx.textAlign = 'right';
                state.ctx.textBaseline = 'bottom';
                state.ctx.fillStyle = colors.baseText;
                state.ctx.fillText(`W${weekNum}`, x + state.cellWidth - 3, y + state.cellHeight - 3);
            }
            currentDrawDate++;
        }

        function getISO8601WeekNumber(date) {
            const MILLISECONDS_PER_DAY = 86400000;
            const MILLISECONDS_PER_WEEK = 604800000;
            const THURSDAY = 4;

            const dayOfWeek = date.getDay() || 7;
            const nearestThursday = new Date(date.getTime() + (THURSDAY - dayOfWeek) * MILLISECONDS_PER_DAY);

            const jan4 = new Date(nearestThursday.getFullYear(), 0, 4);
            const jan4Thursday = new Date(jan4.getTime() + (THURSDAY - (jan4.getDay() || 7)) * MILLISECONDS_PER_DAY);

            return Math.round((nearestThursday.getTime() - jan4Thursday.getTime()) / MILLISECONDS_PER_WEEK) + 1;
        }
    },

    drawDateNumber(date, x, y, col, holidayName, colors) {
        state.ctx.font = '16px sans-serif';
        state.ctx.textAlign = 'left';
        state.ctx.textBaseline = 'top';

        if (holidayName) state.ctx.fillStyle = colors.sunday;
        else if (col === 0) state.ctx.fillStyle = colors.sunday;
        else if (col === 6) state.ctx.fillStyle = colors.saturday;
        else state.ctx.fillStyle = colors.baseText;

        state.ctx.fillText(date, x + 5, y + 5);
    },

    drawHoliday(holidayName, date, x, y, colors) {
        let noteStartY = y;
        if (holidayName) {
            state.ctx.font = '12px sans-serif';
            state.ctx.fillStyle = colors.sunday;
            const holidayText = this.fitText(holidayName, state.cellWidth - 10);
            const xOffset = date >= 10 ? 32 : 22;
            state.ctx.fillText(holidayText, x + xOffset, noteStartY + 7);
        }
        return y + 25;
    },

    drawNotes(dateStr, x, noteStartY, colors) {
        if (!Array.isArray(state.notesData)) return noteStartY;

        const notes = state.notesData
            .filter(n => n.date === dateStr && (!n.content.startsWith('#') && !n.content.startsWith('@')))
            .sort((a, b) => b.content.localeCompare(a.content));

        const english = state.notesData
            .filter(n => n.date === dateStr && (n.content.startsWith('#') || n.content.startsWith('@')))
            .sort((a, b) => b.content.localeCompare(a.content));

        state.ctx.font = '14px sans-serif';
        state.ctx.fillStyle = colors.noteText;

        this.drawRegularNotes(notes, x, noteStartY, colors);
        noteStartY += 15 * CONSTANTS.MAX_SHOW_NOTES + 15;
        this.drawEnglishNotes(english, x, noteStartY, colors);

        return noteStartY;
    },

    drawRegularNotes(notes, x, noteStartY, colors) {
        if (notes.length === 0) return;

        notes.forEach((note, idx) => {
            if (idx < CONSTANTS.MAX_SHOW_NOTES || (idx === CONSTANTS.MAX_SHOW_NOTES && notes.length === (CONSTANTS.MAX_SHOW_NOTES + 1))) {
                if (note.content) {
                    const { isImportant, content } = this.parseImportantMemo(note.content);
                    state.ctx.fillStyle = isImportant ? colors.sunday : colors.noteText;
                    const displayText = this.fitText(content, state.cellWidth - 10);
                    state.ctx.fillText(displayText, x + 5, noteStartY + (idx * 15));

                    if (note.content.length > 14) {
                        state.noteHoverTargets.push({
                            x: x + 3,
                            y: noteStartY + (idx * 15) - 2,
                            w: 15 * 9,
                            h: 14,
                            text: note.content
                        });
                    }
                }
            } else if (idx >= CONSTANTS.MAX_SHOW_NOTES && idx < CONSTANTS.MAX_DOT_NOTES) {
                state.ctx.fillStyle = colors.noteText;
                const dotX = x + (idx - CONSTANTS.MAX_SHOW_NOTES) * 15 + 5;
                const dotY = noteStartY + (CONSTANTS.MAX_SHOW_NOTES * 15);
                state.ctx.fillText(idx === 11 ? '⭕' : '🔵', dotX, dotY);

                if (note.content) {
                    state.noteHoverTargets.push({
                        x: dotX - 2,
                        y: dotY - 2,
                        w: 14,
                        h: 14,
                        text: note.content
                    });
                }
            }
        });
    },

    drawEnglishNotes(english, x, noteStartY, colors) {
        if (english.length === 0) return;

        state.ctx.fillStyle = colors.noteText;
        english.forEach((note, idx) => {
            if (idx < CONSTANTS.MAX_ENGLISH_NOTES) {
                const dotX = x + idx * 15 + 5;
                const dotY = noteStartY;
                const isCode = note.content.startsWith('@');
                state.ctx.fillText(idx === 8 ? '🔚' : (isCode ? '💾' : '🅰️'), dotX, dotY);

                if (note.content) {
                    state.noteHoverTargets.push({
                        x: dotX - 2,
                        y: dotY - 2,
                        w: 14,
                        h: 14,
                        text: note.content
                    });
                }
            }
        });
    },

    drawCellBorder(x, y, year, month, date, todayYear, todayMonth, todayDate, colors) {
        state.ctx.strokeStyle = colors.border;
        state.ctx.lineWidth = 1;
        state.ctx.strokeRect(x, y, state.cellWidth, state.cellHeight);

        if (year === todayYear && month === todayMonth && date === todayDate) {
            state.ctx.strokeStyle = '#2196F3';
            state.ctx.lineWidth = 2;
            state.ctx.strokeRect(x + 2, y + 2, state.cellWidth - 4, state.cellHeight - 4);
            state.ctx.strokeRect(x + 3, y + 3, state.cellWidth - 6, state.cellHeight - 6);
        }
    },

    fitText(text, maxWidth) {
        let width = state.ctx.measureText(text).width;
        const ellipsis = '...';
        const ellipsisWidth = state.ctx.measureText(ellipsis).width;

        if (width <= maxWidth) return text;

        let len = text.length;
        while (width >= maxWidth - ellipsisWidth && len-- > 0) {
            text = text.substring(0, len);
            width = state.ctx.measureText(text).width;
        }
        return text + ellipsis;
    },

    parseImportantMemo(content) {
        let isImportant = false;
        if (content.startsWith('!')) {
            isImportant = true;
            content = content.substring(1);
        }
        return { isImportant, content };
    }
};
