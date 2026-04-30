import type { CheerioAPI } from "cheerio";
import type { CheckItem, SpecInfo } from "../types";
import { buildAxisResult } from "./score";
import { flattenJsonLd, findBusinessNode } from "./jsonld-utils";

export function analyzeMEO($: CheerioAPI, spec?: SpecInfo) {
  const checks: CheckItem[] = [];
  const schemas = flattenJsonLd($);

  const localBiz = findBusinessNode(schemas);

  // LocalBusiness JSON-LD
  checks.push({
    id: "meo_local_biz_schema",
    label: "LocalBusiness JSON-LD",
    status: localBiz ? "ok" : "ng",
    detectedValue: localBiz ? `@type: ${localBiz["@type"]}` : "未設定",
    recommendedValue: "@type: LocalBusiness",
    suggestion: localBiz ? undefined : "LocalBusiness（またはその派生）の構造化データ（JSON-LD）を設置してください。",
    score: localBiz ? 15 : 0,
    maxScore: 15,
    priority: "high",
  });

  // name 一致
  if (spec?.businessName) {
    const schemaName = (localBiz?.["name"] as string) ?? "";
    const match = schemaName.includes(spec.businessName) || spec.businessName.includes(schemaName);
    checks.push({
      id: "meo_name_match",
      label: "ビジネス名一致（JSON-LD ↔ SPEC）",
      status: !schemaName ? "skip" : match ? "ok" : "warn",
      detectedValue: schemaName || "未設定",
      recommendedValue: spec.businessName,
      suggestion: schemaName && !match ? `JSON-LDのnameが「${schemaName}」ですが、指定名「${spec.businessName}」と異なります。` : undefined,
      score: !schemaName ? 0 : match ? 10 : 5,
      maxScore: 10,
      priority: "medium",
    });
  } else {
    checks.push({ id: "meo_name_match", label: "ビジネス名一致", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // address
  if (spec?.address) {
    const addr = (localBiz?.["address"] as Record<string, string>)?.["streetAddress"] ?? (localBiz?.["address"] as string) ?? "";
    const match = addr.length > 0;
    checks.push({
      id: "meo_address",
      label: "住所（JSON-LD設定）",
      status: match ? "ok" : "warn",
      detectedValue: addr || "未設定",
      recommendedValue: spec.address,
      suggestion: !match ? "JSON-LDに住所（address）を設定してください。" : undefined,
      score: match ? 10 : 0,
      maxScore: 10,
      priority: "medium",
    });
  } else {
    checks.push({ id: "meo_address", label: "住所（JSON-LD設定）", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // telephone
  if (spec?.tel) {
    const phone = (localBiz?.["telephone"] as string) ?? "";
    const match = phone.length > 0;
    checks.push({
      id: "meo_telephone",
      label: "電話番号（JSON-LD設定）",
      status: match ? "ok" : "warn",
      detectedValue: phone || "未設定",
      recommendedValue: spec.tel,
      suggestion: !match ? "JSON-LDに電話番号（telephone）を設定してください。" : undefined,
      score: match ? 10 : 0,
      maxScore: 10,
      priority: "medium",
    });
  } else {
    checks.push({ id: "meo_telephone", label: "電話番号（JSON-LD設定）", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // openingHours
  const hours = localBiz?.["openingHours"] ?? localBiz?.["openingHoursSpecification"];
  checks.push({
    id: "meo_opening_hours",
    label: "営業時間（openingHours）",
    status: hours ? "ok" : "warn",
    detectedValue: hours ? "設定済み" : "未設定",
    recommendedValue: "openingHoursの設定",
    suggestion: hours ? undefined : "JSON-LDにopeningHoursを設定してください。",
    score: hours ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // Google Maps iframe
  let hasMaps = false;
  $("iframe").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (src.includes("google.com/maps") || src.includes("maps.google")) hasMaps = true;
  });
  checks.push({
    id: "meo_google_maps",
    label: "Google Maps埋め込み",
    status: hasMaps ? "ok" : "warn",
    detectedValue: hasMaps ? "埋め込みあり" : "なし",
    recommendedValue: "トップまたは会社情報ページに設置",
    suggestion: hasMaps ? undefined : "Google Mapsを埋め込んでください。ローカル検索への信頼性向上につながります。",
    score: hasMaps ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  // tel: リンク
  const hasTelLink = $("a[href^='tel:']").length > 0;
  checks.push({
    id: "meo_tel_link",
    label: "tel:リンク（クリック電話）",
    status: hasTelLink ? "ok" : "warn",
    detectedValue: hasTelLink ? "設置済み" : "なし",
    recommendedValue: "<a href=\"tel:...\">",
    suggestion: hasTelLink ? undefined : "電話番号をtel:リンクにしてください。スマホからワンタップで電話できるようになります。",
    score: hasTelLink ? 10 : 0,
    maxScore: 10,
    priority: "medium",
  });

  return buildAxisResult(checks);
}
