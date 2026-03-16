# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ・履歴を読み込み、検出器初期化、イベント登録を行う。

- `initDetector()`
  - `BarcodeDetector` の利用可否を判定して準備する。

- `bindEvents()`
  - スキャン開始/停止、履歴削除、テーマ切替を紐付ける。

## スキャン

- `startScan()`
  - カメラを起動し、ループ検出を開始する。

- `stopScan()`
  - カメラ・アニメーションループを停止する。

- `scanLoop()`
  - ビデオフレームをキャンバスへ取り込み、QR検出を継続する。

- `handleDetected(value)`
  - 検出結果を表示し、URL判定と履歴追加を行う。

## 履歴表示

- `renderHistory()`
  - 履歴一覧を描画する。

- `clearHistory()`
  - 履歴を全削除する。

## 永続化・補助

- `loadHistory()` / `persistHistory()`
  - 履歴データを保存・復元する。

- `isLikelyUrl(text)` / `formatTimestamp(timestamp)`
  - URL判定と日時表示整形を行う。

- `createId()`
  - 履歴IDを生成する。

- `setStatus(message)`
  - ステータスメッセージを更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
