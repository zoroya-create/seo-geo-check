import { NextRequest, NextResponse } from "next/server";
import type { DiagnosisResult } from "@/lib/types";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";

function gradeColor(grade: string) {
  const map: Record<string, string> = { A: "#16a34a", B: "#2563EB", C: "#D97706", D: "#DC2626", "N/A": "#9CA3AF" };
  return map[grade] ?? "#9CA3AF";
}

function statusIcon(status: string) {
  const map: Record<string, string> = { ok: "✅", ng: "❌", warn: "⚠️", skip: "—" };
  return map[status] ?? "—";
}

function buildHTML(result: DiagnosisResult): string {
  const { meta, summary, axes } = result;
  const date = new Date(meta.diagnosedAt).toLocaleDateString("ja-JP");

  const axisLabels: Record<string, string> = {
    seo: "SEO",
    meo: "MEO（ローカル検索）",
    aio: "AIO / GEO / LLMO（AI検索）",
    ogp: "OGP / SNS最適化",
    eeat: "E-E-A-T（信頼性）",
    techQuality: "技術品質",
    nap: "NAP一貫性",
    psi: "表示速度（PageSpeed）",
  };

  const axisEntries = Object.entries(axes) as [keyof typeof axes, typeof axes[keyof typeof axes]][];

  const axisRows = axisEntries
    .map(([key, axis]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;">${axisLabels[key] ?? key}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="display:inline-block;padding:2px 10px;border-radius:99px;background:${gradeColor(axis.grade)}20;color:${gradeColor(axis.grade)};font-weight:700;">
            ${axis.grade}
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;color:${gradeColor(axis.grade)};">
          ${axis.score}
        </td>
        <td style="padding:8px 12px;font-size:10px;color:#666;">
          ${axis.topIssues[0] ?? "問題なし"}
        </td>
      </tr>
    `)
    .join("");

  const detailSections = axisEntries
    .map(([key, axis]) => {
      const checkRows = axis.checks.map((c) => `
        <tr style="border-bottom:1px solid #F3F4F6;">
          <td style="padding:6px 10px;font-size:10px;">${c.label}</td>
          <td style="padding:6px 10px;text-align:center;font-size:12px;">${statusIcon(c.status)}</td>
          <td style="padding:6px 10px;font-size:10px;color:#555;">${c.detectedValue ?? "—"}</td>
          <td style="padding:6px 10px;font-size:10px;color:#5C35D9;">${c.suggestion ?? ""}</td>
        </tr>
      `).join("");

      return `
        <div style="page-break-inside:avoid;margin-bottom:24px;">
          <div style="background:#5C35D9;color:#fff;padding:8px 14px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:12px;">
            <span style="font-weight:700;font-size:13px;">${axisLabels[key] ?? key}</span>
            <span style="background:white;color:#5C35D9;padding:1px 10px;border-radius:99px;font-size:11px;font-weight:700;">${axis.score}点</span>
            <span style="background:${gradeColor(axis.grade)};color:white;padding:1px 10px;border-radius:99px;font-size:11px;font-weight:700;">グレード ${axis.grade}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
            <thead>
              <tr style="background:#F9FAFB;">
                <th style="padding:6px 10px;text-align:left;font-size:10px;color:#6B7280;">チェック項目</th>
                <th style="padding:6px 10px;text-align:center;font-size:10px;color:#6B7280;">状態</th>
                <th style="padding:6px 10px;text-align:left;font-size:10px;color:#6B7280;">検出値</th>
                <th style="padding:6px 10px;text-align:left;font-size:10px;color:#6B7280;">改善提案</th>
              </tr>
            </thead>
            <tbody>${checkRows}</tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans JP', sans-serif; background: #fff; color: #1a1a2e; font-size: 11px; line-height: 1.6; }
  .page { width: 210mm; min-height: 297mm; padding: 16mm 14mm; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
<!-- 表紙 -->
<div class="page" style="background:linear-gradient(135deg,#3D1FA3 0%,#5C35D9 60%,#7B5CE8 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="font-size:11px;opacity:0.7;margin-bottom:8px;">ぞろ屋式 視認性診断レポート</div>
    <h1 style="font-size:28px;font-weight:700;line-height:1.3;margin-bottom:16px;">SEO / GEO / AIO<br>多軸診断レポート</h1>
    <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:12px 16px;font-size:11px;word-break:break-all;">
      ${meta.url}
    </div>
  </div>
  <div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <div style="text-align:center;">
        <div style="font-size:52px;font-weight:700;line-height:1;">${summary.totalScore}</div>
        <div style="font-size:12px;opacity:0.8;">総合スコア / 100</div>
      </div>
      <div>
        <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">総合グレード</div>
        <div style="font-size:36px;font-weight:700;color:#FFD700;">${summary.grade}</div>
      </div>
    </div>
    <div style="font-size:10px;opacity:0.6;">診断日: ${date}</div>
  </div>
</div>

<!-- サマリーページ -->
<div class="page" style="page-break-before:always;">
  <h2 style="font-size:16px;font-weight:700;color:#5C35D9;border-bottom:2px solid #5C35D9;padding-bottom:8px;margin-bottom:16px;">8軸スコア サマリー</h2>
  <table style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#5C35D9;color:#fff;">
        <th style="padding:10px 12px;text-align:left;">診断軸</th>
        <th style="padding:10px 12px;text-align:center;">グレード</th>
        <th style="padding:10px 12px;text-align:center;">スコア</th>
        <th style="padding:10px 12px;text-align:left;">主な改善ポイント</th>
      </tr>
    </thead>
    <tbody>${axisRows}</tbody>
  </table>
</div>

<!-- 詳細ページ -->
<div class="page" style="page-break-before:always;">
  <h2 style="font-size:16px;font-weight:700;color:#5C35D9;border-bottom:2px solid #5C35D9;padding-bottom:8px;margin-bottom:20px;">各軸の詳細チェック結果</h2>
  ${detailSections}
</div>

</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let result: DiagnosisResult;
  try {
    const body = await req.json();
    result = body.result as DiagnosisResult;
    if (!result?.meta?.url) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const html = buildHTML(result);

  let browser;
  try {
    const isVercel = process.env.VERCEL === "1";
    browser = isVercel
      ? await puppeteerCore.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        })
      : await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    await browser.close();

    const domain = new URL(result.meta.url).hostname.replace(/\./g, "-");
    const date = new Date(result.meta.diagnosedAt).toISOString().slice(0, 10).replace(/-/g, "");

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="seo-report-${domain}-${date}.pdf"`,
      },
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 });
  }
}
