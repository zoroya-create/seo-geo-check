import type { CheerioAPI } from "cheerio";
import type { CheckItem } from "../types";
import { buildAxisResult } from "./score";
import { flattenJsonLd, hasType } from "./jsonld-utils";

export function analyzeAIO($: CheerioAPI) {
  const checks: CheckItem[] = [];
  const schemas = flattenJsonLd($);
  const bodyText = $("body").text();

  // FAQPage スキーマ
  const hasFaqSchema = schemas.some((s) => hasType(s, ["FAQPage"]));
  checks.push({
    id: "aio_faq_schema",
    label: "FAQPageスキーマ",
    status: hasFaqSchema ? "ok" : "ng",
    detectedValue: hasFaqSchema ? "設置済み" : "未設定",
    recommendedValue: "@type: FAQPage",
    suggestion: hasFaqSchema ? undefined : "FAQPage構造化データを設置してください。AI検索（Perplexity・ChatGPT等）に引用されやすくなります。",
    score: hasFaqSchema ? 15 : 0,
    maxScore: 15,
    priority: "high",
  });

  // FAQ セクション（Q&A形式のテキスト）
  const hasFaqSection =
    $("details").length > 0 ||
    $("dl").length > 0 ||
    /[Ｑｑq][．.：:]\s/.test(bodyText) ||
    /よくある質問|FAQ|Q&A/i.test(bodyText);
  checks.push({
    id: "aio_faq_section",
    label: "FAQセクション（Q&A形式コンテンツ）",
    status: hasFaqSection ? "ok" : "warn",
    detectedValue: hasFaqSection ? "あり" : "なし",
    recommendedValue: "質問＋回答形式のコンテンツ",
    suggestion: hasFaqSection ? undefined : "「よくある質問」セクションを設置してください。AI検索での引用率が上がります。",
    score: hasFaqSection ? 10 : 0,
    maxScore: 10,
    priority: "high",
  });

  // 定義文「〇〇とは」
  const hasDefinition = /[\u3040-\u9FFF]{2,}とは[、。\s]/u.test(bodyText);
  checks.push({
    id: "aio_definition",
    label: "定義文「〇〇とは」",
    status: hasDefinition ? "ok" : "warn",
    detectedValue: hasDefinition ? "あり" : "なし",
    recommendedValue: "「〇〇とは」形式の明快な説明",
    suggestion: hasDefinition ? undefined : "「〇〇とは」形式の定義文を入れてください。AI検索で「〜とは」質問への回答として引用されやすくなります。",
    score: hasDefinition ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // 数字・実績データ
  const hasNumbers = /\d+[%件万円倍人回位]/.test(bodyText);
  checks.push({
    id: "aio_numbers",
    label: "数字・実績データ",
    status: hasNumbers ? "ok" : "warn",
    detectedValue: hasNumbers ? "あり" : "なし",
    recommendedValue: "具体的な数値（件数・パーセント・金額等）",
    suggestion: hasNumbers ? undefined : "具体的な数字（実績・事例・統計）を含めてください。AIはデータの引用を好みます。",
    score: hasNumbers ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // Article / WebPage スキーマ
  const hasArticleOrWebPage = schemas.some((s) => hasType(s, ["Article", "WebPage"]));
  checks.push({
    id: "aio_article_schema",
    label: "Article / WebPageスキーマ",
    status: hasArticleOrWebPage ? "ok" : "warn",
    detectedValue: hasArticleOrWebPage ? "設置済み" : "未設定",
    recommendedValue: "@type: Article または WebPage",
    suggestion: hasArticleOrWebPage ? undefined : "Article・WebPage構造化データを設置してください。ページの種類をAIが正確に認識できます。",
    score: hasArticleOrWebPage ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // 権威性シグナル
  const hasAuthority = /受賞|掲載|認定|表彰|メディア|雑誌|新聞|テレビ|認可|許可|資格|免許/.test(bodyText);
  checks.push({
    id: "aio_authority",
    label: "権威性シグナル（受賞・メディア掲載等）",
    status: hasAuthority ? "ok" : "warn",
    detectedValue: hasAuthority ? "あり" : "なし",
    recommendedValue: "受賞・メディア掲載・資格等の記載",
    suggestion: hasAuthority ? undefined : "受賞歴・メディア掲載・資格・認定等の権威性シグナルを追加してください。",
    score: hasAuthority ? 10 : 0,
    maxScore: 10,
    priority: "low",
  });

  return buildAxisResult(checks);
}
