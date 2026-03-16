# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - アプリ起動時のエントリーポイント。
  - テーマ・表示設定・保存データ・ごみ箱・下書きを復元し、初回描画する。

- `bindEvents()`
  - 入力、一覧操作、JSON入出力、ごみ箱操作のイベントを紐付ける。

## メモ登録・編集

- `handleSaveMemo()`
  - タイトル/本文/タグ/色を検証して保存。
  - 編集モード時は既存メモ更新、新規時は追加保存。

- `startEditMemo(memoId)`
  - 対象メモをフォームへ読み込み、編集モードへ切り替える。

- `handleDraftInput()`
  - 入力中のタイトル/本文/タグ/色を下書き保存する。

- `clearDraft()`
  - 下書きを消去し、編集モードならキャンセル扱いにする。

- `togglePinMemo(memoId)`
  - メモのピン留め状態を切り替える。

## 検索・表示切替

- `handleSearchInput(event)`
  - キーワード検索条件を更新する。

- `handleSortChange(event)`
  - 並び替え条件を更新する。

- `handleTagFilterChange(event)`
  - タグ絞り込み条件を更新する。

- `handleDateDisplayChange(event)`
  - 日時表示優先（更新/作成）を切り替える。

- `filterMemos(memos, query, tagFilter)`
  - 検索語とタグ条件でメモを絞り込む。

- `sortMemos(memos, sortBy)`
  - ピン留め優先のうえで並び替える。

## ごみ箱

- `removeMemoById(memoId)`
  - メモを一覧から除外し、ごみ箱へ移動する。

- `clearAllMemos()`
  - 一覧メモをすべてごみ箱へ移動する。

- `restoreMemoFromTrash(memoId)`
  - ごみ箱のメモを一覧へ戻す。

- `permanentlyDeleteFromTrash(memoId)`
  - ごみ箱から1件を完全削除する。

- `handleEmptyTrash()`
  - ごみ箱を空にする。

## JSON入出力

- `exportJson()`
  - メモ・ごみ箱・表示設定をJSONとして書き出す。

- `importJson(event)`
  - JSONファイルを読み込み、置換または追加取り込みを行う。

- `mergeById(current, incoming)`
  - ID重複を避けてデータをマージする。

## 描画

- `render()`
  - 一覧とごみ箱を再描画し、件数表示を更新する。

- `createMemoListItem(memo)`
  - 一覧用メモUI（タイトル、タグ、本文、日時、操作ボタン）を生成。

- `createTrashListItem(memo)`
  - ごみ箱用メモUI（タイトル、削除日時、復元/完全削除）を生成。

## 永続化

- `loadMemos()` / `persistMemos()`
  - 一覧メモを読み書きする。

- `loadTrash()` / `persistTrash()`
  - ごみ箱データを読み書きする。

- `loadDraft()`
  - 下書きデータを復元する。

- `loadPrefs()` / `persistPrefs()`
  - 並び替え・日時表示などの表示設定を保存する。

## 補助関数

- `resetComposer()`
  - 入力欄、下書き、編集状態を初期化する。

- `updateComposerUI()`
  - 編集モードに応じてボタン文言とバッジ表示を更新する。

- `updateCharCounters()`
  - タイトルと本文の文字数カウンタを更新する。

- `handleComposerShortcut(event)`
  - `Ctrl/Cmd + Enter` で保存する。

- `setDraftStatus(message)`
  - ステータスメッセージを表示する。

- `normalizeMemo(item)` / `normalizeTrashMemo(item)`
  - 旧データ互換を保ちながらメモ形式を正規化する。

- `normalizeTag(tag)` / `normalizeColor(color)`
  - タグ・色の許容値を検証し、規定値に補正する。

- `createMemoId()`
  - メモIDを生成する。

- `formatMemoMeta(memo, mode)` / `formatTimestamp(timestamp)`
  - 表示用の日時文字列を生成する。

- `formatDateForFileName(timestamp)`
  - エクスポートファイル名用の日時文字列を生成する。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト/ダークテーマの復元・切替・UI反映を行う。
