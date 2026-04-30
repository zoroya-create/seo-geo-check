import type { CheerioAPI } from "cheerio";
import type { SpecInfo } from "../types";
import { flattenJsonLd, findBusinessNode, JsonLdNode } from "./jsonld-utils";

/**
 * JSON-LD（LocalBusiness / Organization / Corporation）から
 * SPEC情報（社名・住所・電話）を自動抽出する。
 *
 * - ユーザー入力された値があればそれを優先（autoSpecは穴埋めのみ）
 * - @graph ネスト構造にも対応（jsonld-utils を使用）
 * - PostalAddress オブジェクト形式の住所も対応
 * - 国際表記の電話番号（+81-）は日本国内表記（0始まり）に正規化
 */

/** PostalAddress オブジェクトを文字列に変換 */
function addressToString(addr: unknown): string | undefined {
  if (typeof addr === "string") return addr.trim() || undefined;
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>;
    const parts = [
      // 〒記号は付けない（NAP判定の normalize と整合）
      a.postalCode ? String(a.postalCode) : "",
      a.addressRegion as string,
      a.addressLocality as string,
      a.streetAddress as string,
    ].filter((p) => typeof p === "string" && p.length > 0);
    return parts.length > 0 ? parts.join(" ").trim() : undefined;
  }
  return undefined;
}

/**
 * 国際表記の電話番号を日本国内表記に変換。
 * 例: "+81-53-436-7011" → "053-436-7011"
 *     "+81 53 436 7011" → "053-436-7011"
 *     "053-436-7011" → "053-436-7011" （変更なし）
 */
function normalizeJpTel(tel: string | undefined): string | undefined {
  if (!tel) return undefined;
  return tel.replace(/^\+81[- ]?/, "0").trim() || undefined;
}

export interface AutoSpecResult {
  spec: SpecInfo | undefined;
  /** JSON-LDから値が補完されたか */
  autoFilled: boolean;
}

/**
 * SPEC情報を JSON-LD から補完する。
 * ユーザー入力値が指定されていればそれを優先し、未入力フィールドだけ補完。
 */
export function extractSpecFromJsonLd(
  $: CheerioAPI,
  userSpec?: SpecInfo
): AutoSpecResult {
  const nodes: JsonLdNode[] = flattenJsonLd($);
  const bizNode = findBusinessNode(nodes);

  if (!bizNode) {
    return { spec: userSpec, autoFilled: false };
  }

  const fromJsonLd: SpecInfo = {
    businessName: typeof bizNode.name === "string" ? bizNode.name : undefined,
    tel: normalizeJpTel(typeof bizNode.telephone === "string" ? bizNode.telephone : undefined),
    address: addressToString(bizNode.address),
  };

  // ユーザー入力 優先 + JSON-LD で穴埋め
  const merged: SpecInfo = {
    businessName: userSpec?.businessName?.trim() || fromJsonLd.businessName,
    tel: userSpec?.tel?.trim() || fromJsonLd.tel,
    address: userSpec?.address?.trim() || fromJsonLd.address,
    keywords: userSpec?.keywords,
    businessCategory: userSpec?.businessCategory,
  };

  // 何も値がなければ undefined
  const hasAny = merged.businessName || merged.tel || merged.address;
  if (!hasAny) {
    return { spec: userSpec, autoFilled: false };
  }

  // ユーザー入力では空だった項目が補完されたかを判定
  const autoFilled =
    (!userSpec?.businessName && !!merged.businessName) ||
    (!userSpec?.tel && !!merged.tel) ||
    (!userSpec?.address && !!merged.address);

  return { spec: merged, autoFilled };
}
