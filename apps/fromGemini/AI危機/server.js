const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 静的ファイルを serve
app.use(express.static(__dirname));

// OG 画像プレビュー用エンドポイント（PNG画像を返す）
app.get('/api/og-preview', (req, res) => {
  const { r, l, j } = req.query;
  
  if (!r || !l || !j) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // ローカルではダミー画像を生成
  // 実際の og:image プレビューはTwitter経由ではなく、ブラウザ側で Canvas で生成
  const html = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#061924;stop-opacity:1" />
          <stop offset="55%" style="stop-color:#0f1521;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#160b0d;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="600" y="294" font-size="94" font-weight="bold" text-anchor="middle" fill="#ff4b4b" font-family="sans-serif">AI代替率: ${r}%</text>
      <text x="600" y="414" font-size="48" font-weight="bold" text-anchor="middle" fill="#f7c948" font-family="sans-serif">職種余命: ${l}年</text>
      <text x="600" y="560" font-size="30" font-weight="bold" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="monospace">AI余命宣告</text>
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(html);
});

// share.html を動的に生成（og:image メタタグをサーバー側で設定）
app.get('/share', (req, res) => {
  const { r, l, j, w, s } = req.query;

  // share.html をテンプレートとして読み込み
  let html = fs.readFileSync(path.join(__dirname, 'share.html'), 'utf8');

  if (r && l && j) {
    // og:image を SVG API に設定
    const ogImageUrl = `${req.protocol}://${req.get('host')}/api/og-preview?r=${encodeURIComponent(r)}&l=${encodeURIComponent(l)}&j=${encodeURIComponent(j)}`;
    html = html.replace('  <meta id="ogImage" property="og:image" content="" />', 
      `  <meta id="ogImage" property="og:image" content="${ogImageUrl}" />`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`\n✅ ローカルサーバーが起動しました！`);
  console.log(`\n📍 http://localhost:${PORT}`);
  console.log(`\n🧪 動作確認URL:`);
  console.log(`   http://localhost:${PORT}/share?r=75.5&l=3.2&j=営業職&w=高&s=低\n`);
});
