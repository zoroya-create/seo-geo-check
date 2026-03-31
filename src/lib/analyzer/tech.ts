import type { CheerioAPI } from "cheerio";
import type { CheckItem } from "../types";
import { buildAxisResult } from "./score";
import { headRequest } from "./fetch-html";

export async function analyzeTech($: CheerioAPI, url: string) {
  const checks: CheckItem[] = [];
  const origin = new URL(url).origin;

  // meta viewport
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  checks.push({
    id: "tech_viewport",
    label: "meta viewport（モバイル対応）",
    status: viewport ? "ok" : "ng",
    detectedValue: viewport || "未設定",
    recommendedValue: "width=device-width, initial-scale=1",
    suggestion: viewport ? undefined : "meta viewportが設定されていません。スマホ表示に必須です。",
    score: viewport ? 20 : 0,
    maxScore: 20,
    priority: "high",
  });

  // robots.txt
  const robotsStatus = await headRequest(`${origin}/robots.txt`);
  checks.push({
    id: "tech_robots",
    label: "robots.txt",
    status: robotsStatus === 200 ? "ok" : "warn",
    detectedValue: robotsStatus === 200 ? "存在する" : `HTTP ${robotsStatus || "取得不可"}`,
    recommendedValue: "200 OK",
    suggestion: robotsStatus !== 200 ? "robots.txtを設置してください。クローラーへの指示ファイルです。" : undefined,
    score: robotsStatus === 200 ? 15 : 0,
    maxScore: 15,
    priority: "medium",
  });

  // sitemap.xml
  let sitemapStatus = await headRequest(`${origin}/sitemap.xml`);
  if (sitemapStatus !== 200) {
    sitemapStatus = await headRequest(`${origin}/sitemap_index.xml`);
  }
  checks.push({
    id: "tech_sitemap",
    label: "sitemap.xml",
    status: sitemapStatus === 200 ? "ok" : "warn",
    detectedValue: sitemapStatus === 200 ? "存在する" : `HTTP ${sitemapStatus || "取得不可"}`,
    recommendedValue: "200 OK",
    suggestion: sitemapStatus !== 200 ? "sitemap.xmlを設置してください。Googleへのページ送信が効率的になります。" : undefined,
    score: sitemapStatus === 200 ? 15 : 0,
    maxScore: 15,
    priority: "medium",
  });

  // HTTPS（URLで判定済み）
  const isHttps = url.startsWith("https://");
  checks.push({
    id: "tech_https",
    label: "HTTPS（SSL）",
    status: isHttps ? "ok" : "ng",
    detectedValue: isHttps ? "HTTPS" : "HTTP",
    recommendedValue: "HTTPS必須",
    suggestion: isHttps ? undefined : "HTTPSに移行してください。",
    score: isHttps ? 20 : 0,
    maxScore: 20,
    priority: "high",
  });

  // 404ページ
  const fake404 = await (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${origin}/zoroya-404-check-${Date.now()}`, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ZoroyaSEOChecker/1.0)" },
      });
      clearTimeout(timer);
      return res.status;
    } catch {
      return 0;
    }
  })();
  checks.push({
    id: "tech_404",
    label: "カスタム404ページ",
    status: fake404 === 404 ? "ok" : "warn",
    detectedValue: fake404 ? `HTTP ${fake404}` : "取得不可",
    recommendedValue: "404レスポンスを返す",
    suggestion: fake404 !== 404 ? "存在しないURLへのアクセスが404を返していません。カスタム404ページを設定してください。" : undefined,
    score: fake404 === 404 ? 15 : 0,
    maxScore: 15,
    priority: "low",
  });

  return buildAxisResult(checks);
}
