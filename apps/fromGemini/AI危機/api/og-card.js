function escHtml(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function handler(req, res) {
  const { r = '', l = '', j = '診断結果', w = '計測', s = '-' } = req.query || {};
  const rate = toNum(r, 0).toFixed(2);
  const life = toNum(l, 0).toFixed(1);
  const job = escHtml(String(j).slice(0, 28));
  const warn = escHtml(String(w).slice(0, 12));
  const score = escHtml(String(s).slice(0, 6));

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI危機 OG Card</title>
  <style>
    html, body {
      margin: 0;
      width: 1200px;
      height: 630px;
      overflow: hidden;
      font-family: "Noto Sans JP", "Hiragino Sans", sans-serif;
      background:
        radial-gradient(circle at 20% 18%, rgba(0, 229, 255, 0.24), transparent 35%),
        radial-gradient(circle at 82% 78%, rgba(255, 75, 75, 0.24), transparent 36%),
        linear-gradient(135deg, #061924, #0f1521 56%, #160b0d);
      color: #fff;
    }
    .frame { box-sizing: border-box; width: 1200px; height: 630px; padding: 44px 58px; border: 1px solid rgba(255,255,255,0.12); position: relative; }
    .kicker { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.24em; color: rgba(255,255,255,0.85); }
    .job { margin: 16px 0 0; font-size: 52px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 1084px; }
    .rate { margin: 132px 0 0; font-size: 110px; line-height: 1; font-weight: 900; color: #ff4b4b; text-shadow: 0 0 18px rgba(255,75,75,0.35); }
    .life { margin: 18px 0 0; font-size: 56px; line-height: 1.2; font-weight: 800; color: #f7c948; text-shadow: 0 0 14px rgba(247,201,72,0.28); }
    .bottom { position: absolute; left: 58px; right: 58px; bottom: 36px; display: flex; justify-content: space-between; align-items: center; font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.86); }
    .warn { color: #7ee6ff; }
    .score { color: #8bf7c1; }
  </style>
</head>
<body>
  <div class="frame">
    <p class="kicker">AI余命宣告</p>
    <h1 class="job">${job}</h1>
    <p class="rate">AI代替率: ${rate}%</p>
    <p class="life">職種余命: ${life}年</p>
    <div class="bottom">
      <span class="warn">警告レベル: ${warn}</span>
      <span class="score">AI準備度: ${score}</span>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.status(200).send(html);
}

module.exports = handler;
