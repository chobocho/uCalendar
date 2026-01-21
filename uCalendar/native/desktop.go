package native

import (
	"syscall"
	"unsafe"
)

var (
	user32 = syscall.NewLazyDLL("user32.dll")

	// API 정의
	procFindWindowW   = user32.NewProc("FindWindowW")
	procSendMessageW  = user32.NewProc("SendMessageW")
	procSetParent     = user32.NewProc("SetParent")
	procEnumWindows   = user32.NewProc("EnumWindows")
	procFindWindowExW = user32.NewProc("FindWindowExW")
	procGetClassNameW = user32.NewProc("GetClassNameW")
	procGetWindow     = user32.NewProc("GetWindow")
	procShowWindow    = user32.NewProc("ShowWindow")
)

const (
	WM_SPAWN_WORKER = 0x052C // Undocumented message
	GW_HWNDNEXT     = 2      // GetWindow용 상수 (다음 형제 윈도우 찾기)
	SW_SHOW         = 5      // ShowWindow용 상수
)

// 전역 변수로 타겟 윈도우 핸들을 저장 (콜백에서 접근하기 위함)
var targetWorkerW uintptr

// SetWindowToDesktop : 메인 진입 함수
func SetWindowToDesktop(windowTitle string) {
	// 1. 내 앱(Wails) 핸들 찾기
	myHwnd := findWindow(windowTitle)
	if myHwnd == 0 {
		return
	}

	// 2. Progman 찾기
	progman := findWindow("Progman")

	// 3. WorkerW 생성 메시지 전송
	sendMessage(progman, WM_SPAWN_WORKER, 0, 0)

	// 4. EnumWindows를 통해 진짜 바탕화면(WorkerW) 찾기
	// Go 함수를 Windows 콜백으로 변환
	enumCallback := syscall.NewCallback(enumWindowsProc)

	// EnumWindows 호출 (타겟을 찾으면 targetWorkerW 변수에 값이 설정됨)
	procEnumWindows.Call(enumCallback, 0)

	if targetWorkerW != 0 {
		// 5. 내 앱을 찾은 WorkerW의 자식으로 설정
		setParent(myHwnd, targetWorkerW)
	}
}

// enumWindowsProc : EnumWindows가 호출할 콜백 함수 (C++의 BOOL CALLBACK EnumWindowsProc 대응)
func enumWindowsProc(hwnd syscall.Handle, lParam uintptr) uintptr {
	h := uintptr(hwnd)

	// 1. 윈도우의 클래스 이름이 "WorkerW"인지 확인
	// 참고: "WorkerW"는 바탕화면 관련 작업을 처리하는 윈도우 클래스
	if getClassName(h) != "WorkerW" {
		return 1 // 계속 탐색 (return TRUE)
	}

	// 2. 이 WorkerW가 "SHELLDLL_DefView"를 자식으로 가지고 있는지 확인
	// SHELLDLL_DefView는 바탕화면 아이콘을 담고 있는 뷰입니다.
	shellDLL := findWindowEx(h, 0, "SHELLDLL_DefView", "")

	if shellDLL != 0 {
		// 3. 빙고! SHELLDLL_DefView를 가진 WorkerW를 찾았습니다.
		// 하지만 우리가 붙어야 할 곳은 이 윈도우가 아니라,
		// 이 윈도우의 '바로 다음 형제(Next Sibling)'인 WorkerW입니다.
		// (윈도우가 생성될 때 아이콘 뷰 뒤에 배경 레이어가 깔리기 때문)

		targetWorkerW = getWindow(h, GW_HWNDNEXT)

		// 혹시 모르니 타겟 윈도우가 숨겨져 있다면 보이게 설정
		if targetWorkerW != 0 {
			// SW_SHOW
			procShowWindow.Call(targetWorkerW, SW_SHOW)
		}

		return 0 // 탐색 중지 (return FALSE)
	}

	return 1 // 계속 탐색
}

// --- Helper Functions (Boilerplate) ---

func findWindow(title string) uintptr {
	ptrTitle, _ := syscall.UTF16PtrFromString(title)
	ret, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(ptrTitle)))
	return ret
}

func sendMessage(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
	ret, _, _ := procSendMessageW.Call(hwnd, uintptr(msg), wParam, lParam)
	return ret
}

func setParent(child, newParent uintptr) uintptr {
	ret, _, _ := procSetParent.Call(child, newParent)
	return ret
}

func findWindowEx(parent, childAfter uintptr, className, windowName string) uintptr {
	ptrClass, _ := syscall.UTF16PtrFromString(className)
	var ptrName *uint16
	if windowName != "" {
		ptrName, _ = syscall.UTF16PtrFromString(windowName)
	}
	ret, _, _ := procFindWindowExW.Call(
		parent,
		childAfter,
		uintptr(unsafe.Pointer(ptrClass)),
		uintptr(unsafe.Pointer(ptrName)),
	)
	return ret
}

func getClassName(hwnd uintptr) string {
	buf := make([]uint16, 256)
	ret, _, _ := procGetClassNameW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), 256)
	if ret == 0 {
		return ""
	}
	return syscall.UTF16ToString(buf)
}

func getWindow(hwnd uintptr, cmd uint32) uintptr {
	ret, _, _ := procGetWindow.Call(hwnd, uintptr(cmd))
	return ret
}
