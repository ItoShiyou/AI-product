function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampText(v, max = 24) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function handler(req, res) {
  const { r = '', l = '', j = '' } = req.query || {};
  const rate = toNum(r, 0).toFixed(2);
  const life = toNum(l, 0).toFixed(1);
  const job = clampText(j || 'DIAGNOSIS', 28) || 'DIAGNOSIS';

  const text = `AI KIKI | ${job} | RISK ${rate}% | LIFE ${life}y`;
  const imageUrl = `https://dummyimage.com/1200x630/061924/ffffff.png&text=${encodeURIComponent(text)}`;

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.redirect(302, imageUrl);
}

module.exports = handler;
