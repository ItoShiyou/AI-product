# OGPサーバー実装提案（Vercel Functions）

Xの `url` パラメーターに `/share/result` を指定し、クローラーアクセス時に `og:image` を動的に返す構成です。

## 1. フロント側

現在の実装では、以下形式のURLをX投稿へ渡します。

- `/share/result?rid=...&job=...&rate=...&life=...`

このURLはクローラーにも公開されるため、クエリ値は個人情報を含めない前提にしてください。

## 2. Vercel Function（HTMLメタ返却）

`/api/share-result.ts`（または App Router の `app/share/result/route.ts`）で、以下を返します。

- `og:title`
- `og:description`
- `og:image`（画像生成APIのURL）
- `twitter:card` = `summary_large_image`

例（概念コード）:

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const rate = String(req.query.rate ?? "0.00");
  const life = String(req.query.life ?? "0.0");
  const job = String(req.query.job ?? "不明");

  const imageUrl = `${process.env.PUBLIC_BASE_URL}/api/share-image?rate=${encodeURIComponent(rate)}&life=${encodeURIComponent(life)}&job=${encodeURIComponent(job)}`;

  const html = `<!doctype html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta property="og:title" content="AI余命宣告 | ${job}" />
      <meta property="og:description" content="AI代替率 ${rate}% / 職種余命 ${life}年" />
      <meta property="og:image" content="${imageUrl}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta http-equiv="refresh" content="0;url=${process.env.PUBLIC_BASE_URL}/apps/fromGemini/AI危機/" />
    </head>
    <body></body>
  </html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
```

## 3. Vercel Function（画像生成）

`/api/share-image.ts` で、`1200x630` PNG を生成して返却します。

実装方法は2パターンあります。

1. `@vercel/og` + `ImageResponse` でサーバー生成
2. `canvas` もしくは `satori` を使ってPNG化

返却ヘッダー例:

- `Content-Type: image/png`
- `Cache-Control: public, max-age=300, s-maxage=86400`

## 4. 運用のポイント

- クエリをそのままOGへ出さず、`rid` でサーバー保存済みデータを参照する方が安全。
- 画像URLは短く保つ（Xのクロール安定性向上）。
- OGP検証は X Card Validator で確認。
- 共有ページは最終的に本体ページへリダイレクトして UX を維持。
