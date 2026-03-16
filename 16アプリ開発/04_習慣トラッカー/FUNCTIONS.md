# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマと保存データを読み込み、イベントを登録して初回描画する。

- `bindEvents()`
  - 習慣追加、月移動、テーマ切替のイベントを紐付ける。

## 習慣操作

- `addHabitFromInput()`
  - 入力値を検証して習慣を追加する。

- `toggleToday(id)`
  - 指定習慣の「今日」の達成状態を切り替える。

- `deleteHabit(id)`
  - 指定習慣を削除する。

## 月移動

- `shiftMonth(delta)`
  - 表示月を前後へ移動し、年またぎを補正する。

## 描画

- `render()`
  - 月表示、一覧、達成サマリー、空状態を更新する。

- `createHabitElement(habit, monthPrefix)`
  - 習慣1件分のUIを生成する。

## 補助

- `countMonthlyDone(logs, monthPrefix)`
  - 指定月の達成回数を返す。

- `getDaysInMonth(year, month)`
  - 月の日数を返す。

- `getMonthPrefix(year, month)`
  - `YYYY-MM` 形式の月キーを返す。

- `getDateString(date)`
  - `YYYY-MM-DD` 形式の日付文字列を返す。

- `setStatus(message)`
  - 画面上のステータスメッセージを更新する。

- `createHabitId()`
  - 習慣IDを生成する。

## 永続化

- `loadHabits()` / `persistHabits()`
  - ローカルストレージから習慣データを読み書きする。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
