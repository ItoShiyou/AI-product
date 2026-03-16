# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ読み込み、イベント登録、単位選択の初期化を行う。

- `bindEvents()`
  - カテゴリ変更、単位変更、数値入力、入れ替え操作を紐付ける。

## 単位設定

- `populateUnitOptions()`
  - 現在カテゴリの単位一覧をセレクトに反映する。

## 変換

- `render()`
  - 入力値を検証し、変換結果と式を更新する。

- `formatNumber(value)`
  - 表示用数値を整形する。

## 補助

- `setStatus(message)`
  - ステータスメッセージを更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
