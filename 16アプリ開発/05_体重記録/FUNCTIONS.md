# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ・保存データ・日付初期値を設定し、初回描画する。

- `bindEvents()`
  - 記録追加、Enter登録、テーマ切替を紐付ける。

## 記録操作

- `addRecordFromInput()`
  - 入力値を検証し、同日データは更新、未登録日は追加する。

- `deleteRecord(id)`
  - 指定記録を削除する。

## 描画

- `render()`
  - 一覧、サマリー、グラフをまとめて更新する。

- `renderList(sortedRecords)`
  - 日付降順の記録一覧と件数、空状態を更新する。

- `renderSummary(sortedRecords)`
  - 最新体重と前回差分を表示する。

- `renderTrendChart(sortedRecords)`
  - 記録配列から折れ線グラフを描画する。

## 補助

- `getSortedRecords()`
  - 記録を日付降順で返す。

- `setDefaultDate()`
  - 日付入力に本日を設定する。

- `formatDateLabel(dateString)`
  - 日付表示文字列を作る。

- `getCssVar(name)`
  - CSSカスタムプロパティ値を取得する。

- `setStatus(message)`
  - ステータスメッセージを更新する。

- `createRecordId()`
  - 記録IDを生成する。

## 永続化

- `loadRecords()` / `persistRecords()`
  - ローカルストレージから記録を読み書きする。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
