# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマと保存データを読み込み、デフォルト日付を設定してイベントを登録し、初回描画する。

- `bindEvents()`
  - テーマ切替、月ナビゲーション、種別選択、追加ボタン、Enter キー移動を紐付ける。

## 記録操作

- `addEntryFromInput()`
  - 金額・項目・日付を検証して新規記録を追加する。追加後は入力フォームをリセットし、表示月を入力日付に合わせる。

- `deleteEntry(id)`
  - 対象の記録を削除する。

## 描画

- `render()`
  - サマリーと明細一覧をまとめて更新する。

- `renderSummary()`
  - 表示月の収入・支出・収支差を計算してヘッダーカードに反映する。収支がプラス/マイナスで文字色を切り替える。

- `renderList()`
  - 表示月の明細を日付ごとにグループ化して一覧表示する。件数と空状態表示も更新する。

- `renderTypeSelector()`
  - 支出/収入ボタンのアクティブ表示を更新する。

- `createEntryElement(entry)`
  - 1件分のDOMを生成する。種別ドット・項目名・金額・削除ボタンを含む。

## 月ナビゲーション

- `shiftMonth(delta)`
  - 表示月を前後に移動する。年をまたぐ場合は自動繰り上げ・繰り下げを行う。

## 永続化

- `loadEntries()` / `persistEntries()`
  - ローカルストレージから記録を読み書きする。読み込み時はスキーマ検証とサニタイズを実施する。

## 補助

- `getMonthEntries()`
  - `state.viewYear` / `state.viewMonth` に一致する記録だけ返す。

- `groupByDate(entries)`
  - 日付降順でグループ化した `{ date, entries }` 配列を返す。同日内はcreatedAt降順。

- `formatDateLabel(dateStr)`
  - `"YYYY-MM-DD"` を `"M月D日（曜日）"` 形式に変換する。

- `formatYen(amount)`
  - 数値を `"¥X,XXX"` 形式の文字列に変換する。

- `setDefaultDate()`
  - 日付入力フィールドに本日の日付をセットする。

- `setStatus(message)`
  - 画面上のステータスメッセージを更新する。

- `createEntryId()`
  - 記録IDを生成する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
