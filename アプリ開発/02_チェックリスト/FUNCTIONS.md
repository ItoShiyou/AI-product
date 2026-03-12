# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマと保存データを読み込み、イベントを登録して初回描画する。

- `bindEvents()`
  - 追加、フィルター、リセット、全削除、テーマ切替を紐付ける。

## 項目操作

- `addItemFromInput()`
  - 入力値を検証して新規項目を追加する。

- `toggleDone(id)`
  - 対象項目の完了状態を切り替える。

- `deleteItem(id)`
  - 対象項目を削除する。

- `resetDone()`
  - 完了済み項目を一括で未完了に戻す。

- `clearAll()`
  - 項目を全削除する（確認あり）。

## 描画

- `render()`
  - フィルター済み一覧、空状態、件数表示を更新する。

- `renderFilterUI()`
  - フィルターボタンのアクティブ表示を更新する。

- `getVisibleItems()`
  - 現在のフィルター条件に一致する項目だけ返す。

- `createItemElement(item)`
  - 1件分のDOMを生成する。

## 永続化

- `loadItems()` / `persistItems()`
  - ローカルストレージから項目を読み書きする。

## 補助

- `setStatus(message)`
  - 画面上のステータスメッセージを更新する。

- `createItemId()`
  - 項目IDを生成する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
