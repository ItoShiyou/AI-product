# FUNCTIONS

`app.js` の主要関数と責務をまとめています。

## 初期化

- `init()`
  - テーマ・履歴を読み込み、イベント登録、初期色表示を行う。

- `bindEvents()`
  - カメラ開始/停止、色取得、コピー、履歴クリアを紐付ける。

## カメラと色抽出

- `startCamera()` / `stopCamera()`
  - カメラストリームの開始・停止を行う。

- `pickColorFromPointer(event)`
  - 映像のクリック/タップ位置から色を取得する。

- `pickCenterColor()`
  - 映像中央位置をショートカットで取得する。

- `pickColorAtClientPoint(clientX, clientY)`
  - 表示座標を映像座標へ変換し、対象ピクセル色を返す。

- `applyColor(hex, options)`
  - プレビューと表示値を更新し、必要時に履歴へ保存する。

## 履歴

- `renderRecent()`
  - 最近の色をボタン一覧として描画する。

- `clearRecent()`
  - 色履歴を削除する。

- `loadRecent()` / `persistRecent()`
  - 履歴データを保存・復元する。

## コピー・変換

- `copyHex()`
  - 現在色のHEXをクリップボードへコピーする。

- `rgbToHex(r, g, b)` / `hexToRgb(hex)` / `toHex(value)`
  - RGB/HEX 相互変換を行う。

## 補助・テーマ

- `setStatus(message)`
  - ステータスメッセージを更新する。

- `loadTheme()` / `toggleTheme()` / `applyTheme(theme)`
  - ライト・ダークの復元、切替、反映を行う。
