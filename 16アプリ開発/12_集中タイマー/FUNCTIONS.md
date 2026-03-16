# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマと統計データを読み込み、イベント登録と初期描画を行う。

- `bindEvents()`
  - フェーズ切替、開始/停止、スキップ、リセット、通知許可を紐付ける。

## タイマー制御

- `setPhase(nextPhase)`
  - 手動で `focus` / `break` を切り替える。

- `toggleStartPause()`
  - タイマー開始と一時停止を切り替える。

- `tick()`
  - 残り時間を更新し、終了時にフェーズ完了処理を呼ぶ。

- `handlePhaseFinished()`
  - フェーズ終了時の通知、サイクル加算、次フェーズ移行を行う。

- `skipPhase()` / `resetPhase()`
  - 次フェーズへ移動、または現在フェーズを初期化する。

## 描画

- `render()` / `renderTime()`
  - フェーズ表示、時刻、統計表示を更新する。

## 通知・音

- `playAlarm()`
  - フェーズ完了音を再生する。

- `requestNotificationPermission()` / `sendNotification(title, body)`
  - 通知許可と通知発火を扱う。

## 永続化

- `loadStats()` / `persistStats()`
  - 完了サイクル数を保存・復元する。

## 補助・テーマ

- `setStatus(message)`
  - ステータスメッセージを更新する。

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
