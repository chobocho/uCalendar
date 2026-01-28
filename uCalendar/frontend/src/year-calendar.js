// ========================================
// Year Calendar Modal
// ========================================
import { state } from './state.js';
import { CONSTANTS } from './constants.js';
import { HolidaysManager } from './holidays.js';
import { CalendarRenderer } from './calendar-renderer.js';

export function showYearCalendar() {
    // 초기 연도 설정
    let yearViewYear = new Date().getFullYear();

    // 1. 기존 모달 제거 (중복 방지)
    const existingModal = document.getElementById('year-calendar-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 2. CSS 스타일 정의 (공휴일 스타일 및 버튼 스타일 추가)
    const styleId = 'calendar-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #year-calendar-modal {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.5); z-index: 9999;
                display: flex; justify-content: center; align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .calendar-container {
                background: white; width: 95%; max-width: 1100px; height: 85%;
                border-radius: 12px; display: flex; flex-direction: column;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden;
            }
            .calendar-header {
                padding: 15px 20px; background: #2c3e50; color: white;
                display: flex; justify-content: space-between; align-items: center;
                user-select: none;
            }
            .year-nav {
                display: flex; align-items: center; gap: 15px; font-size: 1.5rem; font-weight: bold;
            }
            .nav-btn {
                cursor: pointer; background: rgba(255,255,255,0.1); border: none;
                color: white; padding: 5px 12px; border-radius: 4px; font-size: 1rem;
                transition: background 0.2s;
            }
            .nav-btn:hover { background: rgba(255,255,255,0.3); }
            .year-close-btn {
                cursor: pointer; font-size: 28px; line-height: 1; opacity: 0.8;
            }
            .year-close-btn:hover { opacity: 1; }
            .calendar-body {
                padding: 20px; overflow-y: auto; flex: 1;
                display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px; background-color: #f8f9fa;
            }
            .month-card {
                background: white; border: 1px solid #eee; border-radius: 8px;
                padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                cursor: pointer;
            }
            .month-title {
                text-align: center; font-weight: bold; margin-bottom: 10px;
                color: #2c3e50; font-size: 1.2em; border-bottom: 2px solid #f1f1f1; padding-bottom: 5px;
            }
            .days-grid {
                display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;
            }
            .day-name {
                font-size: 0.8em; font-weight: bold; color: #7f8c8d; margin-bottom: 5px;
            }
            .day-name.sun { color: #e74c3c; } /* 일요일 헤더 빨강 */
            .day-name.sat { color: #3498db; } /* 토요일 헤더 파랑 */

            .day-cell {
                font-size: 0.9em; padding: 6px 2px; border-radius: 4px; position: relative;
            }
            .day-cell:hover { background-color: #f1f1f1; }
            .day-cell.today {
                background-color: #2c3e50; color: white; font-weight: bold;
            }
            .day-cell.holiday {
                color: #e74c3c; font-weight: bold;
            }
            .day-cell.holiday-name {
                display: block; font-size: 0.4em; margin-top: -2px;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                color: #e74c3c;
            }
            .day-cell.sat { color: #3498db; }
            .day-cell.sun { color: #e74c3c; }
            .day-cell.empty { background: transparent; pointer-events: none; }
        `;
        document.head.appendChild(style);
    }

    // 4. 모달 기본 구조 생성
    const modal = document.createElement('div');
    modal.id = 'year-calendar-modal';

    // 배경 클릭 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const container = document.createElement('div');
    container.className = 'calendar-container';

    // 헤더 영역
    const header = document.createElement('div');
    header.className = 'calendar-header';

    // 연도 네비게이션
    const navDiv = document.createElement('div');
    navDiv.className = 'year-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn';
    prevBtn.innerText = '< 이전';

    const yearTitle = document.createElement('span');
    yearTitle.innerText = `${yearViewYear}년`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn';
    nextBtn.innerText = '다음 >';

    navDiv.appendChild(prevBtn);
    navDiv.appendChild(yearTitle);
    navDiv.appendChild(nextBtn);

    const closeBtn = document.createElement('div');
    closeBtn.className = 'year-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.remove();

    header.appendChild(navDiv);
    header.appendChild(closeBtn);

    // 달력 본문 영역
    const body = document.createElement('div');
    body.className = 'calendar-body';

    container.appendChild(header);
    container.appendChild(body);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // 5. 달력 렌더링 함수 (핵심 로직)
    const renderYearCalendar = (year) => {
        body.innerHTML = ''; // 기존 내용 지우기
        yearTitle.innerText = `${year}년`;

        const holidays = HolidaysManager.get(year);
        const dayNames = CONSTANTS.DAY_NAMES;

        // 1~12월 루프
        for (let m = 0; m < 12; m++) {
            const monthCard = document.createElement('div');
            monthCard.className = 'month-card';
            monthCard.addEventListener('click', () => {
                state.currentYear = year;
                state.currentMonth = m;
                modal.remove();
                CalendarRenderer.render();
            });

            const firstDay = new Date(year, m, 1);
            const lastDay = new Date(year, m + 1, 0);
            const startDayIdx = firstDay.getDay();
            const totalDays = lastDay.getDate();

            let html = `<div class="month-title">${m + 1}월</div>`;
            html += `<div class="days-grid">`;

            // 요일 헤더
            dayNames.forEach((day, idx) => {
                const className = idx === 0 ? 'sun' : (idx === 6 ? 'sat' : '');
                html += `<div class="day-name ${className}">${day}</div>`;
            });

            // 빈칸
            for (let i = 0; i < startDayIdx; i++) {
                html += `<div class="day-cell empty"></div>`;
            }

            // 날짜
            for (let d = 1; d <= totalDays; d++) {
                // 날짜 포맷 (YYYY-MM-DD)
                const monthStr = String(m + 1).padStart(2, '0');
                const dayStr = String(d).padStart(2, '0');
                const dateKey = `${year}-${monthStr}-${dayStr}`;

                const currentDayIdx = new Date(year, m, d).getDay(); // 0:일, 6:토

                // 오늘 날짜 확인
                const today = new Date();
                const isToday = (today.getFullYear() === year && today.getMonth() === m && today.getDate() === d);

                // 공휴일 확인
                const holidayName = holidays[dateKey];

                // 클래스 결정
                let classes = ['day-cell'];
                if (isToday) classes.push('today');
                if (holidayName) classes.push('holiday');
                else if (currentDayIdx === 0) classes.push('sun');
                else if (currentDayIdx === 6) classes.push('sat');

                html += `<div class="${classes.join(' ')}">
                    ${d}
                    ${holidayName ? `<span class="day-cell holiday-name">${holidayName}</span>` : ''}
                </div>`;
            }

            html += `</div>`;
            monthCard.innerHTML = html;
            body.appendChild(monthCard);
        }
    };

    // 6. 이벤트 연결 및 초기 실행
    prevBtn.addEventListener('click', () => {
        yearViewYear--;
        renderYearCalendar(yearViewYear);
    });

    nextBtn.addEventListener('click', () => {
        yearViewYear++;
        renderYearCalendar(yearViewYear);
    });

    // 최초 렌더링
    renderYearCalendar(yearViewYear);
}

window.showYearCalendar = showYearCalendar;
