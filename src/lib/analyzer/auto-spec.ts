import type { CheerioAPI } from "cheerio";
import type { SpecInfo } from "../types";

/**
 * JSON-LD（LocalBusiness / Organization / Corporation）から
 * SPEC情報（社名・住所・電話）を自動抽出する。
 *
 * - ユーザー入力された値があればそれを優先（autoSpecは穴埋めのみ）
 * - @graph ネスト構造にも対応
 * - PostalAddress オブジェクト形式の住所も対応
 */

type JsonLdNode = Record<string, unknown>;

/** すべての @type を持つノードをフラットに取り出す */
function flattenJsonLd($: CheerioAPI): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];

  const visit = (obj: unknown) => {
    if (Array.isArray(obj)) {
      obj.forEach(visit);
      return;
    }
    if (obj === null || typeof obj !== "object") return;
    const node = obj as JsonLdNode;
    nodes.push(node);
    // @graph 配下を再帰
    if (node["@graph"]) visit(node["@graph"]);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).html() ?? "{}"));
    } catch {
      /* skip malformed */
    }
  });

  return nodes;
}

/** ノードの @type に対象タイプが含まれるか判定 */
function isBusinessNode(node: JsonLdNode): boolean {
  const t = node["@type"];
  const targets = ["LocalBusiness", "Organization", "Corporation"];
  if (typeof t === "string") {
    return targets.some((target) => t.includes(target));
  }
  if (Array.isArray(t)) {
    return t.some(
      (v) => typeof v === "string" && targets.some((target) => v.includes(target))
    );
  }
  return false;
}

/** PostalAddress オブジェクトを文字列に変換 */
function addressToString(addr: unknown): string | undefined {
  if (typeof addr === "string") return addr.trim() || undefined;
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>;
    const parts = [
      a.postalCode ? `〒${String(a.postalCode)}` : "",
      a.addressRegion as string,
      a.addressLocality as string,
      a.streetAddress as string,
    ].filter((p) => typeof p === "string" && p.length > 0);
    return parts.length > 0 ? parts.join(" ").trim() : undefined;
  }
  return undefined;
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
  const nodes = flattenJsonLd($);
  const bizNode = nodes.find(isBusinessNode);

  if (!bizNode) {
    return { spec: userSpec, autoFilled: false };
  }

  const fromJsonLd: SpecInfo = {
    businessName: typeof bizNode.name === "string" ? bizNode.name : undefined,
    tel: typeof bizNode.telephone === "string" ? bizNode.telephone : undefined,
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
