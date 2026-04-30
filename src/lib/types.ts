// ============================================================
// 診断システム 型定義
// ============================================================

export type Grade = "A" | "B" | "C" | "D" | "N/A";
export type CheckStatus = "ok" | "ng" | "warn" | "skip";
export type Priority = "high" | "medium" | "low";

export interface SpecInfo {
  businessName?: string;
  address?: string;
  tel?: string;
  keywords?: string[];
  businessCategory?: string;
}

export interface DiagnoseRequest {
  url: string;
  spec?: SpecInfo;
  options?: {
    skipPSI?: boolean;
    psiApiKey?: string;
    /** サイト全体評価（複数ページ巡回）。デフォルト true */
    multiPage?: boolean;
    /** SPEC情報未入力時に JSON-LD から自動補完する。デフォルト true */
    autoSpec?: boolean;
  };
}

// ────────────────────────────────────────────────────────────
// チェック項目
// ────────────────────────────────────────────────────────────
export interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  detectedValue?: string;
  recommendedValue?: string;
  suggestion?: string;
  score: number;
  maxScore: number;
  priority: Priority;
}

// ────────────────────────────────────────────────────────────
// 軸別結果
// ────────────────────────────────────────────────────────────
export interface AxisResult {
  score: number;       // 0〜100
  grade: Grade;
  checks: CheckItem[];
  topIssues: string[];
}

export interface PSIMetrics {
  performanceScore: number;
  lcp: number;    // 秒
  cls: number;
  inp: number;    // ms
  fcp: number;    // 秒
  ttfb: number;   // 秒
}

export interface PSIOpportunity {
  id: string;
  title: string;
  estimatedSavings?: string;
}

export interface PSIAxisResult extends AxisResult {
  mobile?: PSIMetrics;
  desktop?: PSIMetrics;
  opportunities: PSIOpportunity[];
}

// ────────────────────────────────────────────────────────────
// 診断結果
// ────────────────────────────────────────────────────────────
export interface DiagnosisResult {
  meta: {
    url: string;
    diagnosedAt: string;
    spec?: SpecInfo;
    /** 巡回したサブページのURL（複数ページ評価モード時） */
    crawledPages?: string[];
    /** SPECがJSON-LDから自動補完されたか */
    specAutoFilled?: boolean;
  };
  summary: {
    totalScore: number;
    grade: Grade;
  };
  axes: {
    seo: AxisResult;
    meo: AxisResult;
    aio: AxisResult;
    ogp: AxisResult;
    eeat: AxisResult;
    techQuality: AxisResult;
    nap: AxisResult;
    psi: PSIAxisResult;
  };
}

// ────────────────────────────────────────────────────────────
// SSE イベント
// ────────────────────────────────────────────────────────────
export interface ProgressEvent {
  type: "progress";
  step: number;
  total: number;
  message: string;
  percent: number;
  axisScore?: number;
}

export interface CompleteEvent {
  type: "complete";
  result: DiagnosisResult;
}

export interface ErrorEvent {
  type: "error";
  code: "FETCH_TIMEOUT" | "FETCH_REFUSED" | "INVALID_URL" | "PSI_ERROR" | "PARSE_ERROR" | "UNKNOWN";
  message: string;
  partialResult?: Partial<DiagnosisResult>;
}

export type SSEEvent = ProgressEvent | CompleteEvent | ErrorEvent;
