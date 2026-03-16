# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ読み込み、イベント登録、初期結果表示を行う。

- `bindEvents()`
  - 定価入力、税率切替、割引率変更、計算実行を紐付ける。

## 計算

- `calculate()`
  - 入力値を検証し、割引後価格・税額・総額を算出する。

- `renderResult(base, discounted, tax, total, saved)`
  - 各結果ラベルを更新する。

- `roundYen(value)` / `formatYen(value)`
  - 円単位で四捨五入し、表示用文字列へ整形する。

## 補助

- `setStatus(message)`
  - ステータスメッセージを更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
