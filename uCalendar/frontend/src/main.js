// 상태 변수
let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth(); // 0 ~ 11
let notesData = []; // 현재 달의 메모들
let canvas, ctx;
let cellWidth, cellHeight;
let selectedDateStr = "";

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

    const headerHeight = 30;
    cellWidth = canvas.width / 7;
    cellHeight = (canvas.height - headerHeight) / 6;

    // 1. 요일 헤더
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    ctx.font = 'bold 12px sans-serif'; // 폰트 크기 살짝 조정
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for(let i=0; i<7; i++) {
        const x = i * cellWidth + cellWidth/2;
        const y = headerHeight / 2;

        if (i === 0) ctx.fillStyle = '#e53935';      // 빨강
        else if (i === 6) ctx.fillStyle = '#3949ab'; // 파랑
        else ctx.fillStyle = '#424242';

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

        // -- 날짜 숫자 --
        // 숫자를 칸의 중앙보다 약간 위(-10px)로 올림
        ctx.font = '16px sans-serif';
        if (col === 0) ctx.fillStyle = '#e53935';
        else if (col === 6) ctx.fillStyle = '#3949ab';
        else ctx.fillStyle = '#212121';

        ctx.fillText(currentDrawDate, x + cellWidth/2, y + cellHeight/2 - 10);

        // -- 메모 텍스트 --
        // 데이터 안전 확인
        if (Array.isArray(notesData)) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDrawDate).padStart(2, '0')}`;

            // 해당 날짜의 메모 찾기 (첫 번째 메모만 표시)
            const note = notesData.find(n => n.date === dateStr);

            if (note && note.content) {
                ctx.font = '12px sans-serif'; // 메모는 작게
                ctx.fillStyle = '#555555';    // 회색 글씨

                // 칸 너비보다 10px 작게(여백) 텍스트 자르기
                const displayText = fitText(ctx, note.content, cellWidth - 10);

                // 숫자의 아래쪽(+15px)에 그리기
                ctx.fillText(displayText, x + cellWidth/2, y + cellHeight/2 + 15);
            }
        }

        currentDrawDate++;
    }
}
// --- 인터랙션 ---

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
        li.innerHTML = `
            <span>${note.content}</span>
            <button class="del-btn" onclick="deleteNote(${note.id})">X</button>
        `;
        listEl.appendChild(li);
    });

    document.getElementById('noteModal').classList.remove('hidden');
}

window.closeModal = () => {
    document.getElementById('noteModal').classList.add('hidden');
    document.getElementById('noteInput').value = '';
};

// 4. 저장 및 삭제 (Golang 호출)
window.saveNote = async () => {
    const text = document.getElementById('noteInput').value;
    if(!text) return;

    await window.go.main.App.SaveNote(selectedDateStr, text);
    closeModal();
    renderCalendar(); // 다시 그려서 점 표시 갱신
};

window.deleteNote = async (id) => {
    if(confirm('Delete this note?')) {
        await window.go.main.App.DeleteNote(id);
        closeModal(); // 닫고
        renderCalendar(); // 갱신
        // UX상 모달을 다시 열어주는 게 좋음 (여기선 생략)
    }
};

// ✅ [추가] 앱 종료 함수
window.quitApp = () => {
    if(confirm("달력을 종료하시겠습니까?")) {
        window.go.main.App.Quit();
    }
};