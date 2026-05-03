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
 * LocalBusiness 派生型一覧（schema.org の LocalBusiness 子クラス）
 * https://schema.org/LocalBusiness
 *
 * 設計方針：
 * Google MEO のベストプラクティスは「1つの LocalBusiness ノードに必要情報を集約」すること。
 * 複数ノードに分散している状態（AIOSEO の Organization と独自実装の LocalBusiness が並列など）は、
 * 整理されていない実装として点数が下がる方が正当な評価になる。
 * よってこの判定では、findBusinessNode が返す「1つのノード」だけを参照し、
 * 複数ノード横断ルックアップは行わない。
 */
const LOCAL_BUSINESS_SUBTYPES = [
  "LocalBusiness",
  "Store",
  "FoodEstablishment",
  "Restaurant",
  "CafeOrCoffeeShop",
  "BeautySalon",
  "HealthAndBeautyBusiness",
  "MedicalBusiness",
  "Dentist",
  "HomeAndConstructionBusiness",
  "GeneralContractor",
  "ProfessionalService",
  "FinancialService",
  "LegalService",
  "EducationalOrganization",
  "School",
  "AutomotiveBusiness",
  "ChildCare",
  "DryCleaningOrLaundry",
  "EmergencyService",
  "EmploymentAgency",
  "EntertainmentBusiness",
  "GovernmentOffice",
  "HealthClub",
  "InternetCafe",
  "Library",
  "LodgingBusiness",
  "Hotel",
  "RealEstateAgent",
  "RecyclingCenter",
  "SelfStorage",
  "ShoppingCenter",
  "SportsActivityLocation",
  "TouristInformationCenter",
  "TravelAgency",
];

/**
 * LocalBusiness / Organization / Corporation 系のノードを取得
 * LocalBusiness 派生を Organization より優先する。
 *
 * 理由：LocalBusiness は openingHours / address / telephone 等の MEO に必要なフィールドを
 * 持つ schema.org クラスなので、これを優先する方が「実装の意図」を正確に評価できる。
 * Organization は組織エンティティの抽象クラスで、MEO 用フィールドは LocalBusiness にしかない。
 */
export function findBusinessNode(nodes: JsonLdNode[]): JsonLdNode | undefined {
  // LocalBusiness 派生を最優先
  const localBiz = nodes.find((n) => hasType(n, LOCAL_BUSINESS_SUBTYPES));
  if (localBiz) return localBiz;
  // 次に Organization / Corporation
  return nodes.find((n) => hasType(n, ["Organization", "Corporation"]));
}