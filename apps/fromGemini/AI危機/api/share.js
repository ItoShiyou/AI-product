function escHtml(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function handler(req, res) {
  const { r = '', l = '', j = '', w = '', s = '' } = req.query;

  if (!r || !l || !j) {
    return res.status(400).send('Missing query params: r, l, j');
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const origin = `${proto}://${host}`;

  const qp = new URLSearchParams({ r: String(r), l: String(l), j: String(j), w: String(w), s: String(s) }).toString();
  const ogImage = `${origin}/api/og?${qp}`;
  const canonical = `${origin}/api/share?${qp}`;
  const uiUrl = `${origin}/share?${qp}`;

  const safeJob = escHtml(j).slice(0, 30);
  const title = `AI危機診断 | ${safeJob}`;
  const desc = `AI代替率 ${escHtml(r)}% / 職種余命 ${escHtml(l)}年`; 

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="canonical" href="${canonical}" />

  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ogImage}" />

  <meta http-equiv="refresh" content="0;url=${uiUrl}" />
</head>
<body>
  <p>リダイレクト中...</p>
  <script>location.replace(${JSON.stringify(uiUrl)});</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600');
  res.status(200).send(html);
}
