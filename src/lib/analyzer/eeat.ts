import type { CheerioAPI } from "cheerio";
import type { CheckItem } from "../types";
import { buildAxisResult } from "./score";

export function analyzeEEAT($: CheerioAPI, url: string) {
  const checks: CheckItem[] = [];
  const bodyText = $("body").text();
  const footerText = $("footer").text();
  const allText = bodyText;

  // 著者プロフィール（名前）
  const hasAuthorName = /代表|著者|院長|先生|プロフィール|ご挨拶|会社概要/.test(allText);
  checks.push({
    id: "eeat_author_name",
    label: "著者・代表者名",
    status: hasAuthorName ? "ok" : "warn",
    detectedValue: hasAuthorName ? "あり" : "なし",
    recommendedValue: "代表者名・著者名の記載",
    suggestion: hasAuthorName ? undefined : "代表者名や著者名を掲載してください。E-E-A-T（経験・専門性・権威性・信頼性）の向上につながります。",
    score: hasAuthorName ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // 著者顔写真
  let hasPhoto = false;
  $("img").each((_, el) => {
    const alt = ($(el).attr("alt") ?? "").toLowerCase();
    const src = $(el).attr("src") ?? "";
    if (/代表|顔|プロフィール|profile|author|staff/.test(alt) || /profile|staff|member|author/.test(src)) {
      hasPhoto = true;
    }
  });
  checks.push({
    id: "eeat_author_photo",
    label: "代表者・著者の顔写真",
    status: hasPhoto ? "ok" : "warn",
    detectedValue: hasPhoto ? "あり" : "なし",
    recommendedValue: "顔写真の掲載",
    suggestion: hasPhoto ? undefined : "代表者・著者の顔写真を掲載してください。信頼性向上に効果的です。",
    score: hasPhoto ? 10 : 0,
    maxScore: 10,
    priority: "low",
  });

  // 会社情報
  const hasCompanyInfo = /設立|創業|資本金|法人番号|所在地|本社|会社概要/.test(allText);
  checks.push({
    id: "eeat_company_info",
    label: "会社情報（設立年・所在地等）",
    status: hasCompanyInfo ? "ok" : "warn",
    detectedValue: hasCompanyInfo ? "あり" : "なし",
    recommendedValue: "設立年・代表者名・所在地の記載",
    suggestion: hasCompanyInfo ? undefined : "会社概要ページに設立年・代表者名・所在地を記載してください。",
    score: hasCompanyInfo ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // 実績・数字
  const hasNumbers = /\d+[%件万円倍人回位年]|\d+名/.test(allText);
  checks.push({
    id: "eeat_results",
    label: "実績・数字の掲載",
    status: hasNumbers ? "ok" : "warn",
    detectedValue: hasNumbers ? "あり" : "なし",
    recommendedValue: "具体的な実績数値",
    suggestion: hasNumbers ? undefined : "具体的な実績数字（対応件数・顧客数・改善率等）を掲載してください。",
    score: hasNumbers ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // SSL (HTTPS)
  const isHttps = url.startsWith("https://");
  checks.push({
    id: "eeat_ssl",
    label: "SSL（HTTPS）",
    status: isHttps ? "ok" : "ng",
    detectedValue: isHttps ? "HTTPS" : "HTTP（SSL非対応）",
    recommendedValue: "HTTPS必須",
    suggestion: isHttps ? undefined : "SSL証明書を導入してHTTPS化してください。Googleのランキング要因です。",
    score: isHttps ? 15 : 0,
    maxScore: 15,
    priority: "high",
  });

  // プライバシーポリシー
  const hasPrivacy = /プライバシー|privacy/i.test(allText);
  checks.push({
    id: "eeat_privacy",
    label: "プライバシーポリシーリンク",
    status: hasPrivacy ? "ok" : "warn",
    detectedValue: hasPrivacy ? "あり" : "なし",
    recommendedValue: "フッターまたはメニューにリンク",
    suggestion: hasPrivacy ? undefined : "プライバシーポリシーページへのリンクをフッターに設置してください。",
    score: hasPrivacy ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // 特定商取引法
  const hasCommercial = /特定商取引|特商法|返品|返金|支払い方法|キャンセル/.test(allText);
  const hasEcommerce = /購入|カート|注文|buy now|add to cart/i.test(allText);
  if (hasEcommerce) {
    checks.push({
      id: "eeat_commercial",
      label: "特定商取引法リンク",
      status: hasCommercial ? "ok" : "ng",
      detectedValue: hasCommercial ? "あり" : "なし",
      recommendedValue: "EC・通販サイトは必須",
      suggestion: hasCommercial ? undefined : "ECサイトは特定商取引法に基づく表示が必須です。",
      score: hasCommercial ? 10 : 0,
      maxScore: 10,
      priority: "high",
    });
  } else {
    checks.push({
      id: "eeat_commercial",
      label: "特定商取引法リンク",
      status: hasCommercial ? "ok" : "warn",
      detectedValue: hasCommercial ? "あり" : "なし",
      recommendedValue: "EC・サービス販売がある場合は設置",
      suggestion: hasCommercial ? undefined : "特定商取引法に基づく表示ページを設置することを推奨します。",
      score: hasCommercial ? 10 : 5,
      maxScore: 10,
      priority: "low",
    });
  }

  return buildAxisResult(checks);
}
