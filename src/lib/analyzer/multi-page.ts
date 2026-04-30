import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { fetchHtml, validateUrl } from "./fetch-html";

/**
 * サイト全体評価（複数ページ巡回）モジュール。
 *
 * 入力URLとは別に、よくある会社情報・お問い合わせ・FAQ系URLを試行し、
 * 取得できたサブページから「Google Maps iframe」「FAQ コンテンツ」を
 * メインページの Cheerio インスタンスに合成する。
 *
 * これにより、analyzer 各軸のロジックを変更せず、
 * サブページの存在を「サイト全体に存在する」ものとして評価できる。
 */

/** よくある会社情報・FAQ系URLのパス候補（優先順） */
const CANDIDATE_PATHS = [
  "/company/",
  "/about/",
  "/about-us/",
  "/contact/",
  "/contact-us/",
  "/access/",
  "/faq/",
  "/q-and-a/",
  "/concept/faq/",
  "/concept/flow/",
];

/** 試行するサブページの最大数（過剰なリクエストを避ける） */
const MAX_SUBPAGES = 6;

/** サブページ取得時のタイムアウト（ms） */
const SUBPAGE_TIMEOUT_MS = 6000;

/**
 * メインURLからオリジン部分を取り出して候補URL一覧を生成する。
 * 同一オリジンの URL のみ対象とする（外部リンクは含めない）。
 */
function buildCandidateUrls(mainUrl: string): string[] {
  let origin: string;
  try {
    origin = new URL(mainUrl).origin;
  } catch {
    return [];
  }
  return CANDIDATE_PATHS.map((p) => origin + p);
}

/** メインURLと重複するパスを除外 */
function dedupeAgainstMain(mainUrl: string, urls: string[]): string[] {
  const mainPath = (() => {
    try {
      return new URL(mainUrl).pathname.replace(/\/$/, "");
    } catch {
      return "";
    }
  })();
  return urls.filter((u) => {
    try {
      const path = new URL(u).pathname.replace(/\/$/, "");
      return path !== mainPath;
    } catch {
      return false;
    }
  });
}

/** 1つのサブページを fetch して Cheerio に変換（失敗時は null） */
async function tryFetchSubpage(url: string): Promise<CheerioAPI | null> {
  // SSRF対策の防衛深層：候補URL生成時に同一オリジン制限はかけているが、
  // ここでも改めて validateUrl を経由してプライベートIP・不正プロトコルを弾く
  try {
    validateUrl(url);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBPAGE_TIMEOUT_MS);
  try {
    const { html } = await fetchHtml(url);
    clearTimeout(timer);
    if (!html) return null;
    return cheerio.load(html);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * サブページから「サイト全体評価」に役立つ要素を抽出して
 * メインページの Cheerio に合成する。
 *
 * 合成対象:
 * - Google Maps iframe（MEO軸の検出用）
 * - dl / details / FAQ系セクション（AIO軸の FAQ コンテンツ検出用）
 */
function mergeSubpageSignals(main$: CheerioAPI, sub$: CheerioAPI): void {
  // Google Maps iframe を main の body に追加
  sub$('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').each(
    (_, el) => {
      const iframeHtml = sub$.html(el);
      if (iframeHtml) {
        main$("body").append(`<!-- merged-from-subpage -->${iframeHtml}`);
      }
    }
  );

  // dl / details 構造（FAQっぽい記法）
  sub$("dl, details").each((_, el) => {
    const html = sub$.html(el);
    if (html && html.length < 50_000) {
      main$("body").append(
        `<div data-merged-faq>${html}</div>`
      );
    }
  });

  // 「よくある質問」「FAQ」「Q&A」を含む section / div
  sub$("section, .faq, [class*='faq']").each((_, el) => {
    const $el = sub$(el);
    const text = $el.text();
    if (
      text.length < 8000 &&
      /よくある(ご)?質問|FAQ|Q&amp;A|Q&A/i.test(text)
    ) {
      main$("body").append(
        `<div data-merged-faq-section>${text}</div>`
      );
    }
  });
}

export interface MultiPageResult {
  /** 巡回成功したサブページのURL一覧 */
  crawledPages: string[];
}

/**
 * サイト全体評価のメインエントリ。
 * メインの $ にサブページの情報を合成して返す（in-place で更新）。
 */
export async function enrichWithSubpages(
  main$: CheerioAPI,
  mainUrl: string
): Promise<MultiPageResult> {
  const candidates = dedupeAgainstMain(mainUrl, buildCandidateUrls(mainUrl)).slice(
    0,
    MAX_SUBPAGES
  );

  if (candidates.length === 0) {
    return { crawledPages: [] };
  }

  // 並列取得（タイムアウト個別管理）
  const results = await Promise.allSettled(
    candidates.map((url) => tryFetchSubpage(url))
  );

  const crawledPages: string[] = [];

  results.forEach((res, idx) => {
    if (res.status === "fulfilled" && res.value !== null) {
      mergeSubpageSignals(main$, res.value);
      crawledPages.push(candidates[idx]);
    }
  });

  return { crawledPages };
}
