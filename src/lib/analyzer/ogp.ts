import type { CheerioAPI } from "cheerio";
import type { CheckItem } from "../types";
import { buildAxisResult } from "./score";

export function analyzeOGP($: CheerioAPI) {
  const checks: CheckItem[] = [];

  const getMeta = (prop: string) =>
    $(`meta[property="${prop}"]`).attr("content")?.trim() ??
    $(`meta[name="${prop}"]`).attr("content")?.trim() ?? "";

  const ogTitle = getMeta("og:title");
  checks.push({
    id: "ogp_title",
    label: "og:title",
    status: ogTitle ? "ok" : "ng",
    detectedValue: ogTitle || "未設定",
    recommendedValue: "ページタイトルを設定",
    suggestion: ogTitle ? undefined : "og:titleを設定してください。SNSシェア時のタイトルになります。",
    score: ogTitle ? 20 : 0,
    maxScore: 20,
    priority: "high",
  });

  const ogDesc = getMeta("og:description");
  checks.push({
    id: "ogp_description",
    label: "og:description",
    status: ogDesc ? "ok" : "ng",
    detectedValue: ogDesc ? ogDesc.slice(0, 60) + (ogDesc.length > 60 ? "..." : "") : "未設定",
    recommendedValue: "120〜160文字の説明文",
    suggestion: ogDesc ? undefined : "og:descriptionを設定してください。SNSシェア時の説明文になります。",
    score: ogDesc ? 20 : 0,
    maxScore: 20,
    priority: "high",
  });

  const ogImage = getMeta("og:image");
  checks.push({
    id: "ogp_image",
    label: "og:image",
    status: ogImage ? "ok" : "ng",
    detectedValue: ogImage ? ogImage.slice(0, 60) + (ogImage.length > 60 ? "..." : "") : "未設定",
    recommendedValue: "1200×630px推奨",
    suggestion: ogImage ? undefined : "og:imageを設定してください。SNSシェア時のサムネイル画像です（1200×630px推奨）。",
    score: ogImage ? 20 : 0,
    maxScore: 20,
    priority: "high",
  });

  const ogType = getMeta("og:type");
  checks.push({
    id: "ogp_type",
    label: "og:type",
    status: ogType ? "ok" : "warn",
    detectedValue: ogType || "未設定",
    recommendedValue: "website（トップページ）/ article（記事ページ）",
    suggestion: ogType ? undefined : "og:typeを設定してください（トップページ: website、記事: article）。",
    score: ogType ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  const twitterCard = getMeta("twitter:card");
  const isLargeCard = twitterCard === "summary_large_image";
  checks.push({
    id: "ogp_twitter_card",
    label: "twitter:card",
    status: !twitterCard ? "warn" : isLargeCard ? "ok" : "warn",
    detectedValue: twitterCard || "未設定",
    recommendedValue: "summary_large_image",
    suggestion: !twitterCard ? "twitter:cardを設定してください（推奨: summary_large_image）。" : !isLargeCard ? "twitter:cardをsummary_large_imageに変更するとX（Twitter）での表示が大きくなります。" : undefined,
    score: !twitterCard ? 0 : isLargeCard ? 15 : 8,
    maxScore: 15,
    priority: "medium",
  });

  return buildAxisResult(checks);
}
