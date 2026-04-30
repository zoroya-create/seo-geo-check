import type { CheerioAPI } from "cheerio";
import type { CheckItem, SpecInfo } from "../types";
import { buildAxisResult } from "./score";
import { flattenJsonLd, findBusinessNode } from "./jsonld-utils";

function normalize(s: string) {
  return s
    .replace(/[　]/g, " ")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[〒]/g, "")
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "-")
    .trim();
}

export function analyzeNAP($: CheerioAPI, spec?: SpecInfo) {
  const checks: CheckItem[] = [];
  const footerText = normalize($("footer").text());
  const bodyText = normalize($("body").text());
  const schemas = flattenJsonLd($);
  const localBiz = findBusinessNode(schemas);

  // フッター 社名
  if (spec?.businessName) {
    const normBizName = normalize(spec.businessName);
    const inFooter = footerText.includes(normBizName);
    checks.push({
      id: "nap_footer_name",
      label: "フッター：社名",
      status: inFooter ? "ok" : "warn",
      detectedValue: inFooter ? "フッターに一致する記載あり" : "フッターに見当たらない",
      recommendedValue: spec.businessName,
      suggestion: inFooter ? undefined : `フッターに「${spec.businessName}」を記載してください。`,
      score: inFooter ? 15 : 0,
      maxScore: 15,
      priority: "medium",
    });
  } else {
    checks.push({ id: "nap_footer_name", label: "フッター：社名（SPEC未入力）", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // フッター 住所
  if (spec?.address) {
    const normAddr = normalize(spec.address);
    const inFooter = footerText.includes(normAddr) || bodyText.includes(normAddr);
    checks.push({
      id: "nap_footer_address",
      label: "フッター：住所",
      status: inFooter ? "ok" : "warn",
      detectedValue: inFooter ? "フッターに記載あり" : "フッターに見当たらない",
      recommendedValue: spec.address,
      suggestion: inFooter ? undefined : `フッターに住所「${spec.address}」を記載してください。`,
      score: inFooter ? 15 : 0,
      maxScore: 15,
      priority: "medium",
    });
  } else {
    checks.push({ id: "nap_footer_address", label: "フッター：住所（SPEC未入力）", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // フッター 電話番号
  if (spec?.tel) {
    // +81-53- 国際表記を 053- 国内表記に変換してから比較
    const telForCompare = spec.tel.replace(/^\+81[- ]?/, "0");
    const normTel = normalize(telForCompare).replace(/-/g, "");
    const normFooter = footerText.replace(/-/g, "");
    const inFooter = normFooter.includes(normTel);
    checks.push({
      id: "nap_footer_tel",
      label: "フッター：電話番号",
      status: inFooter ? "ok" : "warn",
      detectedValue: inFooter ? "フッターに記載あり" : "フッターに見当たらない",
      recommendedValue: spec.tel,
      suggestion: inFooter ? undefined : `フッターに電話番号「${spec.tel}」を記載してください。`,
      score: inFooter ? 15 : 0,
      maxScore: 15,
      priority: "medium",
    });
  } else {
    checks.push({ id: "nap_footer_tel", label: "フッター：電話番号（SPEC未入力）", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // JSON-LD と HTML の一致
  const schemaName = normalize((localBiz?.["name"] as string) ?? "");
  const htmlHasSchemaName = schemaName ? (footerText.includes(schemaName) || bodyText.includes(schemaName)) : null;
  checks.push({
    id: "nap_schema_html_match",
    label: "JSON-LD ↔ HTML テキスト一致",
    status: htmlHasSchemaName === null ? "skip" : htmlHasSchemaName ? "ok" : "warn",
    detectedValue: schemaName ? (htmlHasSchemaName ? "一致" : "不一致") : "JSON-LDなし",
    recommendedValue: "JSON-LDとHTMLテキストの表記を統一",
    suggestion: htmlHasSchemaName === false ? "JSON-LDのname値とHTML本文の社名表記が異なります。統一してください。" : undefined,
    score: htmlHasSchemaName === null ? 0 : htmlHasSchemaName ? 15 : 5,
    maxScore: 15,
    priority: "medium",
  });

  // 電話番号表記統一チェック
  // FAX 周辺の番号は TEL ではないので統一チェック対象から除外する
  const cleanedBody = bodyText
    .replace(/(?:FAX|fax|ファックス|ｆａｘ)[\d()\-ー]{8,15}/gi, "")
    .replace(/(?:FAX|fax|ファックス|ｆａｘ)[\s:：][\d()\-ー]{8,15}/gi, "");
  const telPatterns = [
    ...(cleanedBody.match(/\d{2,4}[-ー]\d{2,4}[-ー]\d{4}/g) ?? []),
    ...(cleanedBody.match(/\(\d{2,4}\)\d{2,4}[-ー]\d{4}/g) ?? []),
    ...(cleanedBody.match(/\d{10,11}/g) ?? []),
  ];
  const uniqueFormats = new Set(telPatterns.map((t) => t.replace(/\d/g, "N")));
  const isUnified = uniqueFormats.size <= 1;
  checks.push({
    id: "nap_tel_format",
    label: "電話番号表記形式の統一",
    status: telPatterns.length === 0 ? "skip" : isUnified ? "ok" : "warn",
    detectedValue: telPatterns.length === 0 ? "電話番号未検出" : `${uniqueFormats.size}種の表記形式`,
    recommendedValue: "ハイフン形式で統一（例: 03-1234-5678）",
    suggestion: !isUnified ? "電話番号の表記形式が複数混在しています。1つの形式に統一してください。" : undefined,
    score: telPatterns.length === 0 ? 0 : isUnified ? 10 : 3,
    maxScore: 10,
    priority: "low",
  });

  return buildAxisResult(checks);
}