package main

import (
	"embed"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func GetToday() string {
	return time.Now().Format("2006-01-02")
}

func main() {
	appVersion := "V1.216.1"
	appTitle := GetToday() + " : uCalendar " + appVersion

	app := NewApp()

	err := wails.Run(&options.App{
		Title:  appTitle,
		Width:  1024,
		Height: 768,

		// [중요] 배경 투명 설정
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0},

		// [중요] 창 테두리 제거 (위젯처럼 보이게)
		// Frameless: true,

		// [중요] 크기 조절 불가 (달력 모양 고정)
		DisableResize: true,
		OnStartup:     app.startup,
		Assets:        assets,
		Bind: []interface{}{
			app,
		},
		// 윈도우 전용 옵션
		Windows: &windows.Options{
			WebviewIsTransparent: true,         // 웹뷰 투명 활성화
			WindowIsTranslucent:  true,         // 창 투명 활성화
			BackdropType:         windows.None, // 블러 효과 제거
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
