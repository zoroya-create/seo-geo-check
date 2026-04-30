import * as cheerio from "cheerio";
import { fetchHtml } from "./fetch-html";
import { analyzeSEO } from "./seo";
import { analyzeMEO } from "./meo";
import { analyzeAIO } from "./aio";
import { analyzeOGP } from "./ogp";
import { analyzeEEAT } from "./eeat";
import { analyzeTech } from "./tech";
import { analyzeNAP } from "./nap";
import { analyzePSI } from "./psi";
import { calcGrade } from "./score";
import { extractSpecFromJsonLd } from "./auto-spec";
import { enrichWithSubpages } from "./multi-page";
import type { DiagnoseRequest, DiagnosisResult, ProgressEvent, CompleteEvent, ErrorEvent } from "../types";

type Emit = (event: ProgressEvent | CompleteEvent | ErrorEvent) => void;

const STEPS = [
  "HTMLを取得中...",
  "サイト全体を巡回中...",
  "SEO 診断中...",
  "MEO 診断中...",
  "AIO / GEO / LLMO 診断中...",
  "OGP / SNS 診断中...",
  "E-E-A-T 診断中...",
  "技術品質 診断中...",
  "NAP一貫性 診断中...",
  "PageSpeed Insights 取得中...",
];
const TOTAL = STEPS.length;

function emit(fn: Emit, step: number, axisScore?: number): void {
  fn({
    type: "progress",
    step,
    total: TOTAL,
    message: STEPS[step - 1],
    percent: Math.round((step / TOTAL) * 100),
    axisScore,
  });
}

export async function runDiagnosis(req: DiagnoseRequest, emitFn: Emit): Promise<void> {
  const { url, spec: userSpec, options } = req;
  const multiPage = options?.multiPage !== false; // デフォルト true
  const autoSpec = options?.autoSpec !== false;   // デフォルト true

  try {
    // STEP 1: HTML取得
    emit(emitFn, 1);
    const { html, finalUrl } = await fetchHtml(url);
    const $ = cheerio.load(html);

    // STEP 2: サイト全体評価（複数ページ巡回）
    emit(emitFn, 2);
    let crawledPages: string[] = [];
    if (multiPage) {
      const enrichResult = await enrichWithSubpages($, finalUrl);
      crawledPages = enrichResult.crawledPages;
    }

    // SPEC自動補完（ユーザー入力 > JSON-LD抽出）
    let spec = userSpec;
    let specAutoFilled = false;
    if (autoSpec) {
      const autoResult = extractSpecFromJsonLd($, userSpec);
      spec = autoResult.spec;
      specAutoFilled = autoResult.autoFilled;
    }

    // STEP 3: SEO
    emit(emitFn, 3);
    const seo = analyzeSEO($, spec);

    // STEP 4: MEO
    emit(emitFn, 4);
    const meo = analyzeMEO($, spec);

    // STEP 5: AIO/GEO/LLMO
    emit(emitFn, 5);
    const aio = analyzeAIO($);

    // STEP 6: OGP/SNS
    emit(emitFn, 6);
    const ogp = analyzeOGP($);

    // STEP 7: E-E-A-T
    emit(emitFn, 7);
    const eeat = analyzeEEAT($, finalUrl);

    // STEP 8: 技術品質（非同期）
    emit(emitFn, 8);
    const techQuality = await analyzeTech($, finalUrl);

    // STEP 9: NAP一貫性
    emit(emitFn, 9);
    const nap = analyzeNAP($, spec);

    // STEP 10: PSI
    let psi;
    if (options?.skipPSI) {
      psi = { score: 0, grade: "N/A" as const, checks: [], topIssues: [], opportunities: [] };
    } else {
      emit(emitFn, 10);
      psi = await analyzePSI(finalUrl, options?.psiApiKey ?? process.env.GOOGLE_PSI_API_KEY);
    }

    // 総合スコア（8軸の加重平均）
    const axisScores = [seo.score, meo.score, aio.score, ogp.score, eeat.score, techQuality.score, nap.score, psi.score];
    const validScores = axisScores.filter((s) => s > 0);
    const totalScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

    const result: DiagnosisResult = {
      meta: {
        url: finalUrl,
        diagnosedAt: new Date().toISOString(),
        spec,
        crawledPages: crawledPages.length > 0 ? crawledPages : undefined,
        specAutoFilled: specAutoFilled || undefined,
      },
      summary: { totalScore, grade: calcGrade(totalScore) },
      axes: { seo, meo, aio, ogp, eeat, techQuality, nap, psi },
    };

    emitFn({ type: "complete", result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    const code = ["FETCH_TIMEOUT", "FETCH_REFUSED", "INVALID_URL", "PSI_ERROR", "PARSE_ERROR"].includes(msg)
      ? (msg as "FETCH_TIMEOUT" | "FETCH_REFUSED" | "INVALID_URL")
      : "UNKNOWN";
    emitFn({ type: "error", code, message: String(err) });
  }
}
