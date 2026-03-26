import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseFromData(data) {
  try {
    if (!data) return null;
    const decoded = JSON.parse(decodeURIComponent(escape(atob(data))));
    return {
      r: num(decoded.replacementRate).toFixed(2),
      l: num(decoded.shareLifespanYears).toFixed(1),
      j: String(decoded.matchedJobTitle || '診断結果').slice(0, 30),
      w: String(decoded.warningLabel || ''),
      s: String(Math.round(num(decoded.aiReadinessScore))),
    };
  } catch {
    return null;
  }
}

export default function handler(req) {
  const { searchParams } = new URL(req.url);

  const direct = {
    r: searchParams.get('r'),
    l: searchParams.get('l'),
    j: searchParams.get('j'),
    w: searchParams.get('w'),
    s: searchParams.get('s'),
  };
  const fromData = parseFromData(searchParams.get('data'));
  const params = (direct.r && direct.l && direct.j) ? direct : fromData;

  if (!params || !params.r || !params.l || !params.j) {
    return new Response('Missing parameters', { status: 400 });
  }

  const rateText = `AI代替率: ${num(params.r).toFixed(2)}%`;
  const lifeText = `職種余命: ${num(params.l).toFixed(1)}年`;
  const jobText = String(params.j).slice(0, 30);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #061924 0%, #0f1521 55%, #160b0d 100%)',
          color: '#ffffff',
          padding: '52px 64px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-120px',
            top: '-120px',
            width: '420px',
            height: '420px',
            borderRadius: '999px',
            background: 'rgba(0,229,255,0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-120px',
            bottom: '-140px',
            width: '460px',
            height: '460px',
            borderRadius: '999px',
            background: 'rgba(255,75,75,0.16)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '32px', letterSpacing: '0.12em', opacity: 0.9 }}>AI余命宣告</div>
          <div style={{ fontSize: '46px', fontWeight: 700 }}>{jobText}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '92px', fontWeight: 800, color: '#ff4b4b' }}>{rateText}</div>
          <div style={{ fontSize: '48px', fontWeight: 700, color: '#f7c948' }}>{lifeText}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '26px', opacity: 0.9 }}>
          <div>警告レベル: {String(params.w || '計測')}</div>
          <div>AI準備度: {String(params.s || '-')}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}
