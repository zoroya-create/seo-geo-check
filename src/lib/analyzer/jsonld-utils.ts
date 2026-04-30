import type { CheerioAPI } from "cheerio";

/**
 * JSON-LD ユーティリティ。
 *
 * Rank Math / Yoast / 自前実装の JSON-LD は @graph 配列構造で出力されることが多い。
 * 単純に script タグを JSON.parse しただけでは @graph 配下のノードが見えないので、
 * すべての analyzer で「フラット化したノードリスト」を共通的に取れるようにする。
 */

export type JsonLdNode = Record<string, unknown>;

/**
 * すべての JSON-LD ノードをフラットに取り出す（@graph も再帰的に展開）
 *
 * 入力例:
 *   <script type="application/ld+json">
 *   { "@context": "...", "@graph": [
 *       {"@type": ["Organization", "LocalBusiness"], ...},
 *       {"@type": "WebSite", ...}
 *   ] }
 *   </script>
 *
 * 出力:
 *   [{"@type": ["Organization", "LocalBusiness"], ...}, {"@type": "WebSite", ...}, ...]
 */
export function flattenJsonLd($: CheerioAPI): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];

  const visit = (obj: unknown) => {
    if (Array.isArray(obj)) {
      obj.forEach(visit);
      return;
    }
    if (obj === null || typeof obj !== "object") return;
    const node = obj as JsonLdNode;
    nodes.push(node);
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

/**
 * @type が指定タイプのいずれかに該当するかをチェック（文字列・配列両対応）
 */
export function hasType(node: JsonLdNode, targets: string[]): boolean {
  const t = node["@type"];
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

/**
 * LocalBusiness / Organization / Corporation 系のノードを取得
 */
export function findBusinessNode(nodes: JsonLdNode[]): JsonLdNode | undefined {
  return nodes.find((n) =>
    hasType(n, ["LocalBusiness", "Organization", "Corporation"])
  );
}