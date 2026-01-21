package main

import (
	"context"
	"embed"
	"time"
	"uCalendar/native" // [중요] go.mod의 모듈명이 uCalendar여야 합니다.

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	appTitle := "uCalendar"

	app := NewApp()

	err := wails.Run(&options.App{
		Title:  appTitle,
		Width:  1024,
		Height: 768,

		// [중요] 배경 투명 설정
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0},

		// [중요] 창 테두리 제거 (위젯처럼 보이게)
		Frameless: true,

		// [중요] 크기 조절 불가 (달력 모양 고정)
		DisableResize: true,

		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
			// 윈도우 생성 타이밍 이슈 방지를 위해 고루틴 + 약간의 딜레이 권장
			go func() {
				time.Sleep(500 * time.Millisecond)     // 안전마진
				native.SetWindowToDesktop("uCalendar") // Wails App Title과 일치해야 함
			}()
		},

		Assets: assets,
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
