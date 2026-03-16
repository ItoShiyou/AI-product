# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ読込、イベント登録、録音一覧描画を行う。

- `bindEvents()`
  - 録音開始/停止、テーマ切替を紐付ける。

## 録音

- `startRecording()`
  - マイク権限を取得し、`MediaRecorder` で録音を開始する。

- `stopRecording()`
  - 録音停止を行う。

- `handleRecordStop()`
  - Blob生成、再生URL作成、録音リストへの追加を行う。

- `cleanupStream()`
  - マイクストリームを解放する。

## 描画・操作

- `renderRecordingTime()`
  - 現在録音中の経過時間表示を更新する。

- `renderRecords()`
  - 録音リスト、再生UI、操作ボタンを描画する。

- `downloadRecord(record)`
  - 録音データをファイルとして保存する。

- `deleteRecord(id)`
  - 録音を削除し、Object URL を解放する。

## 補助

- `formatDuration(ms)` / `formatFileDate(timestamp)`
  - 表示用時間、ファイル名用日時を整形する。

- `createId()`
  - 録音IDを生成する。

- `setStatus(message)`
  - ステータスメッセージを更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
