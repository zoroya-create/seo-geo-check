import type { PSIAxisResult, PSIMetrics, PSIOpportunity, CheckItem } from "../types";
import { calcGrade } from "./score";

const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function fetchPSI(url: string, strategy: "mobile" | "desktop", apiKey?: string): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({ url, strategy });
  if (apiKey) params.set("key", apiKey);

  // Vercel maxDuration=60s に対し、mobile/desktop 並列なので各50sまで許容。
  // 重いサイト（HTML 1MB超・大量JSのテーマ）でも mobile 計測が完走できる。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    const res = await fetch(`${PSI_URL}?${params}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function extractMetrics(data: Record<string, unknown>): PSIMetrics | null {
  try {
    const lr = data["lighthouseResult"] as Record<string, unknown>;
    const audits = lr["audits"] as Record<string, Record<string, unknown>>;
    const cats = lr["categories"] as Record<string, Record<string, unknown>>;
    return {
      performanceScore: Math.round(((cats["performance"]?.["score"] as number) ?? 0) * 100),
      lcp: parseFloat(String((audits["largest-contentful-paint"]?.["numericValue"] as number ?? 0) / 1000).slice(0, 4)),
      cls: parseFloat(String(audits["cumulative-layout-shift"]?.["numericValue"] as number ?? 0).slice(0, 5)),
      inp: Math.round(audits["interaction-to-next-paint"]?.["numericValue"] as number ?? 0),
      fcp: parseFloat(String((audits["first-contentful-paint"]?.["numericValue"] as number ?? 0) / 1000).slice(0, 4)),
      ttfb: parseFloat(String((audits["server-response-time"]?.["numericValue"] as number ?? 0) / 1000).slice(0, 4)),
    };
  } catch {
    return null;
  }
}

function extractOpportunities(data: Record<string, unknown>): PSIOpportunity[] {
  try {
    const lr = data["lighthouseResult"] as Record<string, unknown>;
    const audits = lr["audits"] as Record<string, Record<string, unknown>>;
    return Object.entries(audits)
      .filter(([, v]) => {
        const score = v["score"] as number | null;
        return score !== null && score < 0.9 && v["details"] !== undefined;
      })
      .map(([id, v]) => ({
        id,
        title: v["title"] as string,
        estimatedSavings: v["displayValue"] as string | undefined,
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

function buildPSIChecks(mobile: PSIMetrics | null, desktop: PSIMetrics | null): CheckItem[] {
  const checks: CheckItem[] = [];

  // モバイルスコア
  const mScore = mobile?.performanceScore ?? -1;
  checks.push({
    id: "psi_mobile_score",
    label: "モバイル パフォーマンススコア",
    status: mScore < 0 ? "skip" : mScore >= 90 ? "ok" : mScore >= 50 ? "warn" : "ng",
    detectedValue: mScore < 0 ? "取得不可" : `${mScore}点`,
    recommendedValue: "90点以上",
    suggestion: mScore < 50 && mScore >= 0 ? "モバイルの表示速度が遅すぎます。画像圧縮・キャッシュ設定・JavaScriptの最適化が必要です。" : mScore < 90 && mScore >= 0 ? "モバイルの表示速度を改善してください。目標は90点以上です。" : undefined,
    score: mScore < 0 ? 0 : Math.round((mScore / 100) * 20),
    maxScore: 20,
    priority: mScore < 50 ? "high" : "medium",
  });

  // デスクトップスコア
  const dScore = desktop?.performanceScore ?? -1;
  checks.push({
    id: "psi_desktop_score",
    label: "デスクトップ パフォーマンススコア",
    status: dScore < 0 ? "skip" : dScore >= 90 ? "ok" : dScore >= 50 ? "warn" : "ng",
    detectedValue: dScore < 0 ? "取得不可" : `${dScore}点`,
    recommendedValue: "90点以上",
    suggestion: dScore < 90 && dScore >= 0 ? "デスクトップの表示速度を改善してください。" : undefined,
    score: dScore < 0 ? 0 : Math.round((dScore / 100) * 10),
    maxScore: 10,
    priority: "medium",
  });

  // 各メトリクスはモバイル優先・取れなければデスクトップで代替
  // （モバイルが時間切れで取れないケースに対応）
  const metric = mobile ?? desktop;
  const metricSource = mobile ? "" : desktop ? "（デスクトップ計測値で代替）" : "";

  // LCP
  const lcp = metric?.lcp ?? -1;
  checks.push({
    id: "psi_lcp",
    label: "LCP（最大コンテンツの描画）",
    status: lcp < 0 ? "skip" : lcp <= 2.5 ? "ok" : lcp <= 4 ? "warn" : "ng",
    detectedValue: lcp < 0 ? "取得不可" : `${lcp}秒${metricSource}`,
    recommendedValue: "2.5秒以内",
    suggestion: lcp > 2.5 ? `LCPが${lcp}秒です（目標: 2.5秒以内）。ヒーロー画像の最適化や遅延読み込みの見直しが有効です。` : undefined,
    score: lcp < 0 ? 0 : lcp <= 2.5 ? 10 : lcp <= 4 ? 5 : 0,
    maxScore: 10,
    priority: lcp > 4 ? "high" : "medium",
  });

  // CLS
  const cls = metric?.cls ?? -1;
  checks.push({
    id: "psi_cls",
    label: "CLS（累積レイアウトシフト）",
    status: cls < 0 ? "skip" : cls <= 0.1 ? "ok" : cls <= 0.25 ? "warn" : "ng",
    detectedValue: cls < 0 ? "取得不可" : `${cls}${metricSource}`,
    recommendedValue: "0.1以下",
    suggestion: cls > 0.1 ? `CLSが${cls}です（目標: 0.1以下）。画像・動画に縦横サイズを指定してください。` : undefined,
    score: cls < 0 ? 0 : cls <= 0.1 ? 10 : cls <= 0.25 ? 5 : 0,
    maxScore: 10,
    priority: cls > 0.25 ? "high" : "medium",
  });

  // INP
  const inp = metric?.inp ?? -1;
  checks.push({
    id: "psi_inp",
    label: "INP（インタラクションの応答性）",
    status: inp < 0 ? "skip" : inp <= 200 ? "ok" : inp <= 500 ? "warn" : "ng",
    detectedValue: inp < 0 ? "取得不可" : `${inp}ms${metricSource}`,
    recommendedValue: "200ms以内",
    suggestion: inp > 200 ? `INPが${inp}msです（目標: 200ms以内）。不要なJavaScriptを削減してください。` : undefined,
    score: inp < 0 ? 0 : inp <= 200 ? 10 : inp <= 500 ? 5 : 0,
    maxScore: 10,
    priority: inp > 500 ? "high" : "medium",
  });

  // FCP
  const fcp = metric?.fcp ?? -1;
  checks.push({
    id: "psi_fcp",
    label: "FCP（最初のコンテンツ描画）",
    status: fcp < 0 ? "skip" : fcp <= 1.8 ? "ok" : fcp <= 3 ? "warn" : "ng",
    detectedValue: fcp < 0 ? "取得不可" : `${fcp}秒${metricSource}`,
    recommendedValue: "1.8秒以内",
    suggestion: fcp > 1.8 ? `FCPが${fcp}秒です（目標: 1.8秒以内）。レンダリングブロックリソースを削減してください。` : undefined,
    score: fcp < 0 ? 0 : fcp <= 1.8 ? 10 : fcp <= 3 ? 5 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // TTFB
  const ttfb = metric?.ttfb ?? -1;
  checks.push({
    id: "psi_ttfb",
    label: "TTFB（サーバー応答時間）",
    status: ttfb < 0 ? "skip" : ttfb <= 0.8 ? "ok" : ttfb <= 1.8 ? "warn" : "ng",
    detectedValue: ttfb < 0 ? "取得不可" : `${ttfb}秒${metricSource}`,
    recommendedValue: "0.8秒以内",
    suggestion: ttfb > 0.8 ? `TTFBが${ttfb}秒です（目標: 0.8秒以内）。サーバーのキャッシュ設定やCDNの導入が有効です。` : undefined,
    score: ttfb < 0 ? 0 : ttfb <= 0.8 ? 10 : ttfb <= 1.8 ? 5 : 0,
    maxScore: 10,
    priority: ttfb > 1.8 ? "high" : "medium",
  });

  return checks;
}

export async function analyzePSI(url: string, apiKey?: string): Promise<PSIAxisResult> {
  const [mobileData, desktopData] = await Promise.all([
    fetchPSI(url, "mobile", apiKey),
    fetchPSI(url, "desktop", apiKey),
  ]);

  const mobile = mobileData ? extractMetrics(mobileData) : null;
  const desktop = desktopData ? extractMetrics(desktopData) : null;
  const opportunities = mobileData ? extractOpportunities(mobileData) : [];
  const checks = buildPSIChecks(mobile, desktop);

  const earned = checks.reduce((s, c) => s + c.score, 0);
  const max = checks.reduce((s, c) => s + c.maxScore, 0);
  const score = max === 0 ? 0 : Math.round((earned / max) * 100);
  const grade = calcGrade(score);
  const topIssues = checks
    .filter((c) => c.status === "ng" || c.status === "warn")
    .slice(0, 3)
    .map((c) => c.suggestion ?? c.label);

  return {
    score,
    grade,
    checks,
    topIssues,
    mobile: mobile ?? undefined,
    desktop: desktop ?? undefined,
    opportunities,
  };
}
