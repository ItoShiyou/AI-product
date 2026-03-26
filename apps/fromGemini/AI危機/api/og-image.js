function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampText(v, max = 24) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function fetchPng(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AI-Kiki-OG-Fetcher/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }

  const body = await response.arrayBuffer();
  return Buffer.from(body);
}

async function handler(req, res) {
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

  const cardUrl = `${origin}/api/og-card?${cardQuery}`;
  const imageUrl = `https://image.thum.io/get/png/width/1200/crop/630/noanimate/${cardUrl}`;
  const fallbackText = `AI KIKI | ${job} | RISK ${rate}% | LIFE ${life}y`;
  const fallbackUrl = `https://dummyimage.com/1200x630/061924/ffffff.png&text=${encodeURIComponent(fallbackText)}`;

  try {
    const png = await fetchPng(imageUrl);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(png);
  } catch {
    try {
      const png = await fetchPng(fallbackUrl);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.status(200).send(png);
    } catch {
      return res.status(502).json({ error: 'Failed to generate og image' });
    }
  }
}

module.exports = handler;
