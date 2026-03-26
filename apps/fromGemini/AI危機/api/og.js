function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function escXml(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseFromData(data) {
  if (!data) return null;
  try {
    const jsonText = Buffer.from(String(data), 'base64').toString('utf8');
    const decoded = JSON.parse(jsonText);
    return {
      r: toNum(decoded.replacementRate).toFixed(2),
      l: toNum(decoded.shareLifespanYears).toFixed(1),
      j: String(decoded.matchedJobTitle || '診断結果').slice(0, 30),
      w: String(decoded.warningLabel || '計測'),
      s: String(Math.round(toNum(decoded.aiReadinessScore))),
    };
  } catch {
    return null;
  }
}

function handler(req, res) {
  const { r, l, j, w = '計測', s = '-' } = req.query || {};
  const fromData = parseFromData(req.query?.data);
  const params = (r && l && j) ? { r, l, j, w, s } : fromData;

  if (!params || !params.r || !params.l || !params.j) {
    return res.status(400).json({ error: 'Missing params: r, l, j or data' });
  }

  const rateText = `AI代替率: ${toNum(params.r).toFixed(2)}%`;
  const lifeText = `職種余命: ${toNum(params.l).toFixed(1)}年`;
  const jobText = escXml(String(params.j).slice(0, 30));
  const warnText = escXml(String(params.w || '計測'));
  const readyText = escXml(String(params.s || '-'));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI危機診断のシェア画像">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#061924"/>
      <stop offset="55%" stop-color="#0f1521"/>
      <stop offset="100%" stop-color="#160b0d"/>
    </linearGradient>
    <radialGradient id="blueGlow" cx="0.18" cy="0.2" r="0.45">
      <stop offset="0%" stop-color="rgba(0,229,255,0.34)"/>
      <stop offset="100%" stop-color="rgba(0,229,255,0)"/>
    </radialGradient>
    <radialGradient id="redGlow" cx="0.84" cy="0.78" r="0.50">
      <stop offset="0%" stop-color="rgba(255,75,75,0.30)"/>
      <stop offset="100%" stop-color="rgba(255,75,75,0)"/>
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#blueGlow)"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#redGlow)"/>

  <text x="600" y="84" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="30" font-family="sans-serif" font-weight="700">AI余命宣告</text>
  <text x="600" y="136" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-size="44" font-family="sans-serif" font-weight="700">${jobText}</text>

  <text x="600" y="320" text-anchor="middle" fill="#ff4b4b" font-size="92" font-family="sans-serif" font-weight="800">${escXml(rateText)}</text>
  <text x="600" y="410" text-anchor="middle" fill="#f7c948" font-size="48" font-family="sans-serif" font-weight="700">${escXml(lifeText)}</text>

  <text x="120" y="560" fill="rgba(255,255,255,0.85)" font-size="26" font-family="sans-serif" font-weight="600">警告レベル: ${warnText}</text>
  <text x="810" y="560" fill="rgba(255,255,255,0.85)" font-size="26" font-family="sans-serif" font-weight="600">AI準備度: ${readyText}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(svg);
}

module.exports = handler;
