// 상태 변수
let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth(); // 0 ~ 11
let notesData = []; // 현재 달의 메모들
let canvas, ctx;
let cellWidth, cellHeight;
let selectedDateStr = "";

// [추가] 다크 테마 상태 변수
let isDarkTheme = false;

// Wails 런타임이 준비되면 실행
// (Wails JS 바인딩은 window.go.main.App 아래에 생성됩니다)

window.onload = () => {
    canvas = document.getElementById('calendarCanvas');
    ctx = canvas.getContext('2d');

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', onCanvasClick);

    // [중요] Wails 런타임이 준비될 때까지 기다렸다가 실행
    if (window.go && window.go.main && window.go.main.App) {
        initApp();
    } else {
        // 런타임이 아직 없으면 준비될 때까지 대기 (0.5초 간격 재시도)
        const checkWails = setInterval(() => {
            if (window.go && window.go.main && window.go.main.App) {
                clearInterval(checkWails);
                initApp();
            }
        }, 100);
    }
};

window.toggleTheme = () => {
    isDarkTheme = !isDarkTheme;

    // CSS 클래스 토글 (배경색 변경)
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    // 캔버스 다시 그리기 (글자색 변경 적용)
    drawCanvas();
};

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    renderCalendar();
}


function initApp() {
    resizeCanvas();
    // 초기 실행
    renderCalendar();
}

async function renderCalendar() {
    // [수정] 날짜 텍스트를 가장 먼저 업데이트 (DB 에러가 나도 날짜는 맞게 나오도록)
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    document.getElementById('current-date-display').innerText = ym;

    try {
        // 데이터 가져오기 시도
        const result = await window.go.main.App.GetNotesByMonth(ym);
        notesData = result || [];
    } catch(e) {
        // 에러가 나면 경고창을 띄워 눈으로 확인
        alert("DB 로드 실패: " + e);
        notesData = [];
    }

    // 그리기
    drawCanvas();
}

// 공휴일 데이터 생성 함수
function getHolidays(year) {
    const holidays = {};

    // (1) 양력 고정 공휴일
    const solarHolidays = [
        { date: '01-01', name: '신정' },
        { date: '03-01', name: '삼일절' },
        { date: '05-05', name: '어린이날' },
        { date: '06-06', name: '현충일' },
        { date: '08-15', name: '광복절' },
        { date: '10-03', name: '개천절' },
        { date: '10-09', name: '한글날' },
        { date: '12-25', name: '크리스마스' }
    ];

    solarHolidays.forEach(h => {
        holidays[`${year}-${h.date}`] = h.name;
    });

    // (2) 음력 공휴일 (설날, 추석, 부처님오신날 등)
    // ※ 순수 JS만으로는 음력 계산이 매우 복잡하므로 주요 연도만 하드코딩 예시로 넣었습니다.
    // 필요시 라이브러리를 쓰거나 API를 연동해야 정확합니다.
    const lunarData = {
        2024: {
            '02-09': '설날 연휴', '02-10': '설날', '02-11': '설날 연휴', '02-12': '대체공휴일',
            '04-10': '국회의원선거', '05-15': '부처님오신날', '05-06': '대체공휴일',
            '09-16': '추석 연휴', '09-17': '추석', '09-18': '추석 연휴'
        },
        2025: {
            '01-28': '설날 연휴', '01-29': '설날', '01-30': '설날 연휴', '03-03': '대체공휴일',
            '05-05': '부처님오신날', '05-06': '대체공휴일', // 어린이날과 겹침
            '10-05': '추석 연휴', '10-06': '추석', '10-07': '추석 연휴', '10-08': '대체공휴일'
        },
        2026: {
            '02-16': '설날 연휴', '02-17': '설날', '02-18': '설날 연휴',
            '05-24': '부처님오신날', '05-25': '대체공휴일',
            '09-24': '추석 연휴', '09-25': '추석', '09-26': '추석 연휴'
        },
        2027: {
            '02-06': '설날 연휴', '02-07': '설날', '02-08': '설날 연휴', '02-09': '대체공휴일', // 설날 일요일 겹침
            '05-13': '부처님오신날',
            '09-14': '추석 연휴', '09-15': '추석', '09-16': '추석 연휴'
        },
        2028: {
            '01-26': '설날 연휴', '01-27': '설날', '01-28': '설날 연휴',
            '05-02': '부처님오신날',
            '10-02': '추석 연휴', '10-03': '추석', '10-04': '추석 연휴', '10-05': '대체공휴일' // 개천절과 겹침
        },
        2029: {
            '02-12': '설날 연휴', '02-13': '설날', '02-14': '설날 연휴',
            '05-20': '부처님오신날', '05-21': '대체공휴일', // 일요일 겹침
            '09-21': '추석 연휴', '09-22': '추석', '09-23': '추석 연휴', '09-24': '대체공휴일' // 일요일 겹침
        },
        2030: {
            '02-02': '설날 연휴', '02-03': '설날', '02-04': '설날 연휴', '02-05': '대체공휴일', // 설날 일요일 겹침
            '05-09': '부처님오신날',
            '09-11': '추석 연휴', '09-12': '추석', '09-13': '추석 연휴'
        },
        2031: {
            '01-22': '설날 연휴', '01-23': '설날', '01-24': '설날 연휴',
            '05-28': '부처님오신날',
            '09-30': '추석 연휴', '10-01': '추석', '10-02': '추석 연휴'
        },
        2032: {
            '02-10': '설날 연휴', '02-11': '설날', '02-12': '설날 연휴',
            '05-16': '부처님오신날', '05-17': '대체공휴일', // 일요일 겹침
            '09-18': '추석 연휴', '09-19': '추석', '09-20': '추석 연휴', '09-21': '대체공휴일' // 추석 일요일 겹침
        },
        2033: {
            '01-30': '설날 연휴', '01-31': '설날', '02-01': '설날 연휴', '02-02': '대체공휴일', // 연휴 첫날 일요일 겹침
            '05-06': '부처님오신날',
            '10-06': '추석 연휴', '10-07': '추석', '10-08': '추석 연휴'
        },
        2034: {
            '02-18': '설날 연휴', '02-19': '설날', '02-20': '설날 연휴', '02-21': '대체공휴일', // 설날 일요일 겹침
            '05-25': '부처님오신날',
            '09-26': '추석 연휴', '09-27': '추석', '09-28': '추석 연휴'
        },
        2035: {
            '02-07': '설날 연휴', '02-08': '설날', '02-09': '설날 연휴',
            '05-15': '부처님오신날',
            '09-15': '추석 연휴', '09-16': '추석', '09-17': '추석 연휴', '09-18': '대체공휴일' // 추석 일요일 겹침
        },
        2036: {
            '01-27': '설날 연휴', '01-28': '설날', '01-29': '설날 연휴', '01-30': '대체공휴일', // 연휴 첫날 일요일 겹침
            '05-03': '부처님오신날', '05-06': '대체공휴일', // 토요일 겹침(5/5 어린이날과 연이어 대체공휴일 발생)
            '10-03': '추석 연휴', '10-04': '추석', '10-05': '추석 연휴',
            '10-06': '대체공휴일', '10-07': '대체공휴일' // 개천절+일요일 겹침으로 이틀 대체 휴무
        }
    };

    if (lunarData[year]) {
        Object.assign(holidays, (() => {
            const formatted = {};
            for (const [date, name] of Object.entries(lunarData[year])) {
                formatted[`${year}-${date}`] = name;
            }
            return formatted;
        })());
    }

    return holidays;
};

// [helper] 텍스트가 칸을 넘어가면 '...'을 붙여주는 함수
function fitText(ctx, text, maxWidth) {
    let width = ctx.measureText(text).width;
    const ellipsis = '...';
    const ellipsisWidth = ctx.measureText(ellipsis).width;

    if (width <= maxWidth) {
        return text;
    }

    let len = text.length;
    while (width >= maxWidth - ellipsisWidth && len-- > 0) {
        text = text.substring(0, len);
        width = ctx.measureText(text).width;
    }
    return text + ellipsis;
}

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    const holidays = getHolidays(currentYear);

    // [추가] 오늘 날짜 계산
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const headerHeight = 30;
    cellWidth = canvas.width / 7;
    cellHeight = (canvas.height - headerHeight * 2) / 6;

    // [추가] 테마에 따른 색상 정의
    // 다크모드일 때 일반 글씨는 흰색(#ffffff), 라이트모드는 진한 회색(#212121)
    const baseTextColor = isDarkTheme ? '#ffffff' : '#212121';
    const noteTextColor = isDarkTheme ? '#cccccc' : '#000000'; // 메모 색상
    const dayHeaderColor = isDarkTheme ? '#dddddd' : '#424242';
    const sundayColor = isDarkTheme ? '#FF003C' : '#e53935';
    const saturdayColor = isDarkTheme ? '#00FFFF' : '#5c6bc0';
    
    // 1. 요일 헤더
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    ctx.font = 'bold 12px sans-serif';
    ctx.textBaseline = 'middle';

    for(let i=0; i<7; i++) {
        const x = i * cellWidth + cellWidth/2;
        const y = headerHeight / 2;

        ctx.textAlign = 'center';
        if (i === 0) ctx.fillStyle = sundayColor;      // 빨강 (일요일)
        else if (i === 6) ctx.fillStyle = saturdayColor; // 파랑 (토요일)
        else ctx.fillStyle = dayHeaderColor;         // [수정] 평일 헤더 색상 변수 사용

        ctx.fillText(days[i], x, y);
    }

    // 2. 날짜 및 메모 그리기
    let currentDrawDate = 1;

    for (let i = 0; i < 42; i++) {
        if (i < firstDayIndex) continue;
        if (currentDrawDate > lastDate) break;

        const col = i % 7;
        const row = Math.floor(i / 7);

        const x = col * cellWidth;
        const y = headerHeight + row * cellHeight;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDrawDate).padStart(2, '0')}`;
        const holidayName = holidays[dateStr];

        // -- 날짜 숫자 --
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (holidayName) ctx.fillStyle = sundayColor;
        else if (col === 0) ctx.fillStyle = sundayColor;
        else if (col === 6) ctx.fillStyle = saturdayColor; // [수정] 파랑색 약간 조정
        else ctx.fillStyle = baseTextColor;            // [수정] 일반 날짜 색상 변수 사용

        ctx.fillText(currentDrawDate, x + 5, y + 5);

        // -- Holiday label --
        let noteStartY = y + 25;
        if (holidayName) {
            ctx.font = '12px sans-serif';
            ctx.fillStyle = sundayColor;
            const holidayText = fitText(ctx, holidayName, cellWidth - 10);
            ctx.fillText(holidayText, x + 5, noteStartY);
            noteStartY += 15;
        }

        // -- 메모 텍스트 --
        if (Array.isArray(notesData)) {
            const matches = notesData.filter(n => n.date === dateStr);

            if (matches.length > 0) {
                ctx.font = '14px sans-serif';
                ctx.fillStyle = noteTextColor; // [수정] 메모 색상 변수 사용

                matches.forEach((note, idx) => {
                    if (idx < 4) {
                        if (note.content) {
                            const __ret = isImportantMemo( note.content);
                            const isImportant = __ret.isImportant;
                            const content = __ret.content;

                            ctx.fillStyle = isImportant ? sundayColor : noteTextColor; // [수정] !로 시작하면 빨간색
                            const displayText = fitText(ctx, content, cellWidth - 10);
                            ctx.fillText(displayText, x + 5, noteStartY + (idx * 15));
                        }
                    } else if (idx >= 4 && idx < 11) {
                        ctx.fillStyle = noteTextColor;
                        ctx.fillText('🔵', x + (idx - 4) * 15, noteStartY + (4 * 15));
                    } else if (idx === 11) {
                        ctx.fillStyle = noteTextColor;
                        ctx.fillText('⭕', x + (idx - 4) * 15, noteStartY + (4 * 15));
                    }
                });
            }
        }

        // -- 날짜 칸 테두리 --
        ctx.strokeStyle = isDarkTheme ? '#555555' : '#dddddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // [추가] 오늘 날짜면 파란색 굵은 2중 테두리
        if (currentYear === todayYear && currentMonth === todayMonth && currentDrawDate === todayDate) {
            ctx.strokeStyle = '#2196F3'; // 파란색
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
            ctx.strokeRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6);
        }

        currentDrawDate++;
    }
}

function isImportantMemo(content) {
    let isImportant = false;

    if (content.startsWith('!')) {
        isImportant = true;
        content = content.substring(1);
    }
    return {isImportant, content};
}

// --- 인터랙션 ---
window.showYearCalendar = () => {
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

        const holidays = getHolidays(year);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // 1~12월 루프
        for (let m = 0; m < 12; m++) {
            const monthCard = document.createElement('div');
            monthCard.className = 'month-card';
            monthCard.addEventListener('click', () => {
                currentYear = year;
                currentMonth = m;
                modal.remove();
                renderCalendar();
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
};

// 현재 월로 이동
window.backToThisMonth = () => {
    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth();

    if (thisYear === currentYear && thisMonth === currentMonth) {
        return;
    }
    currentYear = thisYear;
    currentMonth = thisMonth    ;
    renderCalendar();
};

// 1. 월 이동
window.changeMonth = (delta) => {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
};

// 2. 캔버스 클릭 (날짜 판별)
function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const headerHeight = 30;
    if (mouseY < headerHeight) return; // 헤더 클릭 무시

    // 좌표 -> 행/열 인덱스 변환
    const col = Math.floor(mouseX / cellWidth);
    const row = Math.floor((mouseY - headerHeight) / cellHeight);

    // 날짜 역계산
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const clickedDay = (row * 7) + col - firstDay + 1;
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    if (clickedDay >= 1 && clickedDay <= lastDate) {
        openModal(clickedDay);
    }
}

// 3. 모달 열기
async function openModal(day) {
    selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    document.getElementById('modalDateTitle').innerText = selectedDateStr;

    // 해당 날짜의 메모 필터링
    const notes = notesData.filter(n => n.date === selectedDateStr);

    const listEl = document.getElementById('modalNoteList');
    listEl.innerHTML = '';

    notes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'note-item';

        const checkBtn = document.createElement('button');
        checkBtn.className = 'check-btn';
        checkBtn.textContent = '\u2714\uFE0F';
        checkBtn.addEventListener('click', () => checkNote(note.id, note.content));

        const contentSpan = document.createElement('span');
        contentSpan.className = 'note-content';
        contentSpan.textContent = note.content;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'del-btn';
        deleteBtn.textContent = '\u274C';
        deleteBtn.addEventListener('click', () => deleteNote(note.id, note.content));

        li.append(checkBtn, contentSpan, deleteBtn);
        listEl.appendChild(li);
    });
    document.getElementById('noteModal').classList.remove('hidden');
}

window.closeModal = () => {
    document.getElementById('noteModal').classList.add('hidden');
    document.getElementById('noteInput').value = '';
};

window.checkNote = async (id, text) => {
    const checkBtn = '\u2705';
    if (text.startsWith(checkBtn)) text = text.substring(1);
    else text = checkBtn + text;
    await window.go.main.App.UpdateNote(id, text);
    // selectedDateStr에서 일(day)을 추출
    const day = parseInt(selectedDateStr.split('-')[2]);
    await renderCalendar(); // 갱신 (데이터가 다시 로드될 때까지 기다림)
    openModal(day); // 모달을 다시 열어줌
};

// 4. 저장 및 삭제 (Golang 호출)
window.deleteNote = async (id, text) => {
    if(confirm(`${text}\n\n메모를 삭제 하시겠습니까?`)) {
        await window.go.main.App.DeleteNote(id);
        
        // selectedDateStr에서 일(day)을 추출
        const day = parseInt(selectedDateStr.split('-')[2]);
        
        await renderCalendar(); // 갱신 (데이터가 다시 로드될 때까지 기다림)
        openModal(day); // 모달을 다시 열어줌
    }
};

window.saveNote = async () => {
    const text = document.getElementById('noteInput').value;
    if(!text) return;

    await window.go.main.App.SaveNote(selectedDateStr, text);

    // selectedDateStr에서 일(day)을 추출
    const day = parseInt(selectedDateStr.split('-')[2]);

    await renderCalendar(); 
    openModal(day); // 저장 후 모달 유지
    document.getElementById('noteInput').value = ''; // 입력창 비우기
};

// ✅ [추가] 앱 종료 함수
window.quitApp = () => {
    if(confirm("달력을 종료하시겠습니까?")) {
        window.go.main.App.Quit();
    }
};
