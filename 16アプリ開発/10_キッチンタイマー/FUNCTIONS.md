# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ読み込み、イベント登録、初期表示を行う。

- `bindEvents()`
  - 入力、プリセット、開始/停止/リセット、通知許可を紐付ける。

## タイマー

- `syncFromInputs()`
  - 分・秒入力から残り時間を更新する。

- `startTimer()` / `pauseTimer()` / `resetTimer()`
  - カウントダウンの開始、一時停止、初期値への復帰を行う。

- `tick()`
  - 残り時間を更新し、0秒到達時の完了処理を実行する。

- `renderTime()`
  - `mm:ss` 表示を更新する。

## 通知・音

- `playAlarm()`
  - Web Audio API でアラーム音を再生する。

- `requestNotificationPermission()`
  - 通知許可をリクエストする。

- `sendNotification(title, body)`
  - 許可済み時に通知を送る。

## 補助

- `setStatus(message)`
  - ステータスメッセージを更新する。

- `clamp(value, min, max)`
  - 数値を範囲内に丸める。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
