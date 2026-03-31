import * as cheerio from "cheerio";

const TIMEOUT_MS = 10000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ZoroyaSEOChecker/1.0; +https://zoroya.co.jp)";

// プライベートIPをブロックするSSRF対策
function isPrivateOrLoopback(hostname: string): boolean {
  if (hostname === "localhost") return true;
  const privatePatterns = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];
  return privatePatterns.some((p) => p.test(hostname));
}

export function validateUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("INVALID_URL");
  if (isPrivateOrLoopback(parsed.hostname)) throw new Error("INVALID_URL");
  return parsed;
}

export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 404) {
      throw new Error("FETCH_REFUSED");
    }
    const html = await res.text();
    return { html, finalUrl: res.url ?? url };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") throw new Error("FETCH_TIMEOUT");
    throw err;
  }
}

export async function headRequest(url: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(timer);
    return res.status;
  } catch {
    clearTimeout(timer);
    return 0;
  }
}

export function parseJson(html: string) {
  return cheerio.load(html);
}
