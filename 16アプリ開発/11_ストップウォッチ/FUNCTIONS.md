# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ読み込み、イベント登録、初期描画を行う。

- `bindEvents()`
  - 開始/停止、ラップ、リセットを紐付ける。

## 計測

- `toggleStartStop()`
  - 計測状態を切り替える。

- `addLap()`
  - 現在の経過時間をラップとして先頭追加する。

- `resetAll()`
  - 計測状態とラップを初期化する。

- `nowElapsed()`
  - 計測開始時刻からの経過ミリ秒を返す。

## 描画

- `render()`
  - 時刻表示・ボタン文言・ラップ一覧を更新する。

- `renderLaps()`
  - ラップ一覧と件数表示を更新する。

- `formatTime(ms)`
  - `mm:ss.cc` 形式へ整形する。

## 補助

- `setStatus(message)`
  - ステータスメッセージを更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
