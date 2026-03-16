# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマと保存済みルーレット項目を復元し、初期描画する。

- `bindEvents()`
  - モード切替、抽選、履歴クリア、項目保存を紐付ける。

## モード管理

- `setMode(mode)`
  - ダイス/ルーレットを切り替える。

- `renderMode()`
  - モードに応じたUI表示とボタン状態を更新する。

## 抽選

- `runDraw()`
  - 現在モードの候補を作成し、抽選処理を開始する。

- `animateResult(candidates, onDone)`
  - 抽選中のランダム表示アニメーションを行う。

- `parseRouletteItems()`
  - テキスト入力を項目配列へ変換する。

- `randomPick(items)`
  - 候補から1件を乱数選択する。

## 履歴

- `addHistory(result)`
  - 抽選結果を履歴へ追加する。

- `renderHistory()`
  - 履歴一覧を描画する。

- `clearHistory()`
  - 履歴を全削除する。

## 永続化・補助

- `loadItems()` / `persistItems()`
  - ルーレット項目を保存・復元する。

- `formatTime(timestamp)` / `clamp(value, min, max)` / `createId()`
  - 表示整形、範囲補正、ID生成を行う。

- `setStatus(message)` / `render()`
  - ステータス更新、初期描画を行う。

## テーマ

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
