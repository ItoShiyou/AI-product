# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマを読み込み、イベントを登録し、初期結果を描画する。

- `bindEvents()`
  - 入力フィールド、丸め設定、計算ボタン、テーマ切替を紐付ける。

## 計算

- `calculate()`
  - 総額・人数を検証し、丸めルールを適用して結果を計算する。

- `applyRounding(value, mode)`
  - 丸め設定（切り上げ/切り捨て/四捨五入）を適用する。

- `renderResult(rawPerPerson, roundedPerPerson, collected, difference)`
  - 1人あたり、徴収合計、差額、内訳を画面へ反映する。

## 補助

- `formatYen(value)`
  - 金額を円表示形式へ変換する。

- `setStatus(message)`
  - ステータスメッセージを更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
