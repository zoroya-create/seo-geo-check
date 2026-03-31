import type { CheerioAPI } from "cheerio";
import type { CheckItem, SpecInfo } from "../types";
import { buildAxisResult } from "./score";

export function analyzeSEO($: CheerioAPI, spec?: SpecInfo) {
  const checks: CheckItem[] = [];
  const kw = spec?.keywords ?? [];
  const bodyText = $("body").text();

  // title 存在
  const title = $("title").first().text().trim();
  checks.push({
    id: "seo_title_exists",
    label: "titleタグ",
    status: title ? "ok" : "ng",
    detectedValue: title || "未設定",
    recommendedValue: "キーワードを含む60文字以内",
    suggestion: title ? undefined : "titleタグを設定してください。ページの主要キーワードを含めた60文字以内が理想です。",
    score: title ? 5 : 0,
    maxScore: 5,
    priority: "high",
  });

  // title 文字数
  if (title) {
    const titleLen = title.length;
    const titleOk = titleLen <= 60;
    checks.push({
      id: "seo_title_length",
      label: "title文字数（60文字以内）",
      status: titleOk ? "ok" : "warn",
      detectedValue: `${titleLen}文字`,
      recommendedValue: "60文字以内",
      suggestion: titleOk ? undefined : `titleが${titleLen}文字あります。60文字以内に収めてください。`,
      score: titleOk ? 5 : 2,
      maxScore: 5,
      priority: "medium",
    });
  }

  // title キーワード
  if (kw.length > 0) {
    const hit = kw.some((k) => title.includes(k));
    checks.push({
      id: "seo_title_kw",
      label: "titleキーワード含有",
      status: hit ? "ok" : "warn",
      detectedValue: title,
      recommendedValue: `「${kw[0]}」等を含める`,
      suggestion: hit ? undefined : `titleにターゲットキーワード（${kw.join("・")}）を含めてください。`,
      score: hit ? 5 : 0,
      maxScore: 5,
      priority: "high",
    });
  } else {
    checks.push({ id: "seo_title_kw", label: "titleキーワード含有", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // meta description 存在
  const desc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  checks.push({
    id: "seo_desc_exists",
    label: "meta description",
    status: desc ? "ok" : "ng",
    detectedValue: desc || "未設定",
    recommendedValue: "120〜160文字",
    suggestion: desc ? undefined : "meta descriptionを設定してください。120〜160文字でキーワードを含めた説明文を記述します。",
    score: desc ? 5 : 0,
    maxScore: 5,
    priority: "high",
  });

  // meta description 文字数
  if (desc) {
    const dLen = desc.length;
    const dOk = dLen >= 120 && dLen <= 160;
    checks.push({
      id: "seo_desc_length",
      label: "meta description文字数（120〜160文字）",
      status: dOk ? "ok" : "warn",
      detectedValue: `${dLen}文字`,
      recommendedValue: "120〜160文字",
      suggestion: dOk ? undefined : `meta descriptionが${dLen}文字です。120〜160文字の範囲に調整してください。`,
      score: dOk ? 5 : 2,
      maxScore: 5,
      priority: "medium",
    });
  }

  // meta description キーワード
  if (kw.length > 0 && desc) {
    const hit = kw.some((k) => desc.includes(k));
    checks.push({
      id: "seo_desc_kw",
      label: "meta descriptionキーワード含有",
      status: hit ? "ok" : "warn",
      detectedValue: desc.slice(0, 60) + (desc.length > 60 ? "..." : ""),
      recommendedValue: `「${kw[0]}」等を含める`,
      suggestion: hit ? undefined : "meta descriptionにターゲットキーワードを含めてください。",
      score: hit ? 5 : 0,
      maxScore: 5,
      priority: "medium",
    });
  } else if (kw.length > 0) {
    checks.push({ id: "seo_desc_kw", label: "meta descriptionキーワード含有", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // h1 存在・数
  const h1s = $("h1");
  const h1Count = h1s.length;
  const h1Text = h1s.first().text().trim();
  checks.push({
    id: "seo_h1",
    label: "h1タグ（1つのみ）",
    status: h1Count === 1 ? "ok" : h1Count === 0 ? "ng" : "warn",
    detectedValue: h1Count === 0 ? "未設定" : `${h1Count}個（「${h1Text.slice(0, 30)}${h1Text.length > 30 ? "..." : ""}」）`,
    recommendedValue: "1ページに1つ",
    suggestion: h1Count === 0 ? "h1タグを設定してください。" : h1Count > 1 ? `h1タグが${h1Count}個あります。1ページに1つにしてください。` : undefined,
    score: h1Count === 1 ? 10 : h1Count === 0 ? 0 : 5,
    maxScore: 10,
    priority: "high",
  });

  // h1 キーワード
  if (kw.length > 0 && h1Text) {
    const hit = kw.some((k) => h1Text.includes(k));
    checks.push({
      id: "seo_h1_kw",
      label: "h1キーワード含有",
      status: hit ? "ok" : "warn",
      detectedValue: h1Text.slice(0, 40),
      recommendedValue: `「${kw[0]}」等を含める`,
      suggestion: hit ? undefined : "h1にターゲットキーワードを含めてください。",
      score: hit ? 5 : 0,
      maxScore: 5,
      priority: "high",
    });
  } else if (kw.length > 0) {
    checks.push({ id: "seo_h1_kw", label: "h1キーワード含有", status: "skip", score: 0, maxScore: 0, priority: "low" });
  }

  // h2/h3 構造
  let structureOk = true;
  let lastLevel = 0;
  $("h1,h2,h3,h4").each((_, el) => {
    const level = parseInt(el.tagName.replace("h", ""));
    if (lastLevel > 0 && level > lastLevel + 1) structureOk = false;
    lastLevel = level;
  });
  const hasH2 = $("h2").length > 0;
  checks.push({
    id: "seo_heading_structure",
    label: "見出し階層構造（h2/h3）",
    status: hasH2 && structureOk ? "ok" : hasH2 ? "warn" : "ng",
    detectedValue: `h2:${$("h2").length}個 / h3:${$("h3").length}個`,
    recommendedValue: "論理的な階層（h1→h2→h3）",
    suggestion: !hasH2 ? "h2見出しを設置して、コンテンツ構造を明確にしてください。" : !structureOk ? "見出し階層が飛んでいます（h2の次にh4など）。順序を整えてください。" : undefined,
    score: hasH2 && structureOk ? 5 : hasH2 ? 3 : 0,
    maxScore: 5,
    priority: "medium",
  });

  // 画像 alt
  const imgs = $("img");
  const imgCount = imgs.length;
  let noAlt = 0;
  imgs.each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt && alt !== "") noAlt++;
  });
  checks.push({
    id: "seo_img_alt",
    label: "画像alt属性",
    status: noAlt === 0 ? "ok" : noAlt < imgCount ? "warn" : "ng",
    detectedValue: imgCount === 0 ? "画像なし" : `${imgCount}枚中${noAlt}枚がaltなし`,
    recommendedValue: "全画像にalt属性を設定",
    suggestion: noAlt > 0 ? `${noAlt}枚の画像にalt属性がありません。画像の内容を説明するaltテキストを設定してください。` : undefined,
    score: imgCount === 0 ? 5 : noAlt === 0 ? 5 : noAlt < imgCount ? 2 : 0,
    maxScore: 5,
    priority: "medium",
  });

  // canonical
  const canonical = $('link[rel="canonical"]').attr("href") ?? "";
  checks.push({
    id: "seo_canonical",
    label: "canonicalタグ",
    status: canonical ? "ok" : "warn",
    detectedValue: canonical || "未設定",
    recommendedValue: "自ページURLを指定",
    suggestion: canonical ? undefined : "canonicalタグが設定されていません。重複コンテンツ対策として設定することを推奨します。",
    score: canonical ? 5 : 0,
    maxScore: 5,
    priority: "medium",
  });

  // 内部リンク
  const internalLinks = $("a[href]").filter((_, el) => {
    const href = $(el).attr("href") ?? "";
    return href.startsWith("/") || href.startsWith("#") || href.includes(bodyText.slice(0, 20));
  }).length;
  checks.push({
    id: "seo_internal_links",
    label: "内部リンク",
    status: internalLinks > 0 ? "ok" : "warn",
    detectedValue: `${internalLinks}件の内部リンク`,
    recommendedValue: "主要ページへのリンクあり",
    suggestion: internalLinks === 0 ? "内部リンクを設置して、他のページへの回遊を促してください。" : undefined,
    score: internalLinks > 0 ? 5 : 0,
    maxScore: 5,
    priority: "low",
  });

  return buildAxisResult(checks);
}
