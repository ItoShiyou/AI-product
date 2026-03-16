# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ読み込み、イベント登録、初回描画を行う。

- `bindEvents()`
  - キーパッド操作とテーマ切替を紐付ける。

## 入力処理

- `handleAction(action, value)`
  - キー種別に応じて処理を振り分ける。

- `inputDigit(digit)`
  - 数字入力を現在値へ反映する。

- `inputDot()`
  - 小数点入力を制御する。

- `chooseOperator(nextOperator)`
  - 演算子選択と中間計算を行う。

- `applyPercent()`
  - 現在値に対して％計算を適用する。

## 計算

- `evaluate()`
  - 式を確定計算し、履歴を更新する。

- `calculate(a, b, operator)`
  - 演算子に応じて計算結果を返す。

- `roundResult(value)`
  - 小数誤差を抑える丸めを行う。

## 補助

- `clearAll()`
  - 入力状態を初期化する。

- `deleteOne()`
  - 現在値の末尾1文字を削除する。

- `formatNumber(value)`
  - 表示用の数値文字列へ整形する。

- `symbolForOperator(operator)`
  - 内部演算子を表示記号に変換する。

- `render()`
  - 式表示、結果表示、履歴表示を更新する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
