import { createCanvas } from 'canvas';

export default async function handler(req, res) {
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({ error: 'Missing data param' });
  }

  try {
    // ★ Base64 デコード
    const resultJson = decodeURIComponent(escape(atob(data)));
    const result = JSON.parse(resultJson);

    // ★ Canvas 1200x630 で og:image 用画像生成
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    // グラデーション背景
    const bg = ctx.createLinearGradient(0, 0, 1200, 630);
    bg.addColorStop(0, '#061924');
    bg.addColorStop(0.55, '#0f1521');
    bg.addColorStop(1, '#160b0d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 630);

    // グロー効果（青）
    const glowBlue = ctx.createRadialGradient(180, 120, 10, 180, 120, 340);
    glowBlue.addColorStop(0, 'rgba(0,229,255,0.34)');
    glowBlue.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = glowBlue;
    ctx.fillRect(0, 0, 1200, 630);

    // グロー効果（赤）
    const glowRed = ctx.createRadialGradient(1000, 500, 10, 1000, 500, 360);
    glowRed.addColorStop(0, 'rgba(255,75,75,0.30)');
    glowRed.addColorStop(1, 'rgba(255,75,75,0)');
    ctx.fillStyle = glowRed;
    ctx.fillRect(0, 0, 1200, 630);

    // スキャンライン
    for (let y = 0; y < 630; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)';
      ctx.fillRect(0, y, 1200, 1);
    }

    // ★ テキスト描画
    const replacementRateText = `AI代替率: ${Number(result.replacementRate).toFixed(2)}%`;
    const lifespanText = `職種余命: ${Number(result.shareLifespanYears).toFixed(1)}年`;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // AI代替率（大きい赤テキスト）
    ctx.font = 'bold 94px "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#ff4b4b';
    ctx.fillText(replacementRateText, 600, 294);

    // 職種余命（黄色）
    ctx.font = 'bold 48px "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#f7c948';
    ctx.fillText(lifespanText, 600, 414);

    // ロゴ
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('AI余命宣告', 600, 560);

    // ★ PNG として返却
    const buffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);

  } catch (error) {
    console.error('OG image generation error:', error);
    res.status(500).json({ error: 'Image generation failed' });
  }
}
