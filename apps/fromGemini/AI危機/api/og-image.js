function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampText(v, max = 24) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function handler(req, res) {
  const { r = '', l = '', j = '', w = '計測', s = '-' } = req.query || {};
  const rate = toNum(r, 0).toFixed(2);
  const life = toNum(l, 0).toFixed(1);
  const job = clampText(j || 'DIAGNOSIS', 28) || 'DIAGNOSIS';
  const warn = clampText(w || '計測', 12);
  const score = clampText(s || '-', 6);

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const origin = `${proto}://${host}`;

  const cardQuery = new URLSearchParams({
    r: String(rate),
    l: String(life),
    j: String(job),
    w: String(warn),
    s: String(score),
  }).toString();

  const cardUrl = `${origin}/og-card?${cardQuery}`;
  const imageUrl = `https://image.thum.io/get/png/width/1200/crop/630/noanimate/${cardUrl}`;

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.redirect(302, imageUrl);
}

module.exports = handler;
