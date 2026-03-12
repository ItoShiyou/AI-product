完全版：Vocal Matching AI 製品要求仕様書 (PRD)
1. 音声解析エンジン仕様 (Signal Processing)ブラウザのリソースを効率的に活用し、一貫性のある特徴量抽出を行うための技術仕様を定義する。
1.1. Web Audio API / AnalyserNode 設定Sampling Rate: ブラウザのデフォルト（通常 44.1kHz または 48kHz）。fftSize: 2048周波数分解能 $\Delta f \approx 21.5\text{Hz}$ を確保し、ピッチ検出の精度を維持する。SmoothingTimeConstant: 0.8（描画用ではなく解析用のため、急激な変動を抑制）。
1.2. Meyda.js 特徴量抽出パラメータ抽出は requestAnimationFrame ではなく、 ScriptProcessorNode または AudioWorklet（推奨）を用いてバッファを落とさず処理する。bufferSize: 512hopSize: 256 (50% overlap)windowingFunction: hamming抽出項目:mfcc: 13次元。声質の主要な指紋。spectralCentroid: 明るさ（輝度）の判定用。rms: 入力音量の監視（閾値判定用）。
1.3. マッチングアルゴリズム（数学的定義）ユーザーの平均特徴量ベクトル $\mathbf{u}$ と歌手 $i$ の基準ベクトル $\mathbf{v}_i$ の類似度 $S_i$ を算出する。音色類似度（Cosine Similarity）:$$S_{\text{timbre}} = \frac{\mathbf{u} \cdot \mathbf{v}_i}{\|\mathbf{u}\| \|\mathbf{v}_i\|}$$※MFCCはベクトルの「向き」が重要であるため、ユークリッド距離ではなくコサイン類似度を採用し、$-1$ 〜 $1$ を $0$ 〜 $100$ に正規化する。音域スコア（Range Overlap）:ユーザーのピッチ範囲 $[f_{\min}, f_{\max}]$ が歌手の推奨音域に収まっているかを判定。包含率 $R$ を乗数として使用。総合一致度 $Score$:$$Score = (w_1 \cdot S_{\text{timbre}} + w_2 \cdot R) \times 100$$（初期値: $w_1 = 0.7, w_2 = 0.3$）
2. UI/UX ステート管理仕様状態遷移の整合性を保つため、以下のステートマシンに従って実装すること。State期待されるUI挙動トリガー / 条件IDLE「解析開始」ボタンのみ有効。初期状態。MIC_REQUESTブラウザの権限ダイアログ表示。ボタン非活性。ユーザーが開始ボタンを押下。RECORDING波形ビジュアライザー表示。「録音中...」インジケータ。getUserMedia 成功時。ANALYZINGスピナー表示。「声質を精査中...」のテキスト。録音停止ボタン押下、または規定秒数（10s）経過。SUCCESS結果表示、チャート描画、SNSシェアボタン有効化。マッチング計算完了。ERRORエラーメッセージと「再試行」ボタンを表示。権限拒否、または解析失敗。
3. エッジケースとエラーハンドリング「手軽さ」を損なわないよう、以下のフォールバックを実装すること。マイク権限拒否 (NotAllowedError):「マイクの使用を許可してください。設定から変更可能です」というトースト通知を表示。無音入力 (rms < threshold):3秒間無音が続いた場合、「声が検出されません。マイクに近づいてください」というガイドをリアルタイムで表示。入力不足（1.5秒未満の録音）:解析へ進ませず、「データが不足しています。もう少し長く歌ってください」と警告。過大入力（クリッピング）:音割れを検知した場合、「音が大きすぎます。マイクから少し離れてください」と警告。
4. データモデル具体例 (JSON)100名の歌手データは以下の構造を持つ artists.json として管理する。JSON{
  "artists": [
    {
      "id": "jp-001",
      "name": "あいみょん",
      "gender": "female",
      "pitch_range": {
        "min": "lowG",
        "max": "hiD",
        "freq_min": 196.00,
        "freq_max": 587.33
      },
      "timbre": {
        "spectral_centroid": 1850.5,
        "mfcc_mean": [
          -12.4, 1.2, -0.5, 0.8, -1.2, 0.3, -0.4, 0.2, -0.1, 0.5, -0.2, 0.1, -0.3
        ],
        "tightness": 0.65
      },
      "tags": ["チェストボイス中心", "ストレート", "中音域豊富"]
    }
  ]
}
5. パフォーマンス目標とメモリ管理「Web完結」を実現するためのエンジニアリング規約。メモリ解放: SUCCESS ステート移行後、直ちに AudioContext.suspend() を呼び出し、解析に使用した Buffer を明示的に null 代入してガベージコレクション（GC）を促す。描画負荷: ビジュアライザーは requestAnimationFrame で実行し、CPU負荷を $10\%$ 以下に抑える。ライブラリの軽量化: Chart.js は tree-shaking を行い、レーダーチャートに必要なモジュールのみをインポートすること。6. テクニカルリードからの実装への指示Vanilla JS / TypeScript:今回は「完成速度」を優先するため、React等のオーバーヘッドを避け、DOM操作は最小限にする。Web Worker の検討:メインスレッドをブロックしないよう、MFCCの平均化計算やベクトル比較ロジックは Web Worker に委譲することを推奨する。テスト:異なるデバイス（iPhone vs Windows PC）で spectralCentroid の出力値に極端な乖離（$20\%$ 以上）がないかを確認せよ。