import { NextRequest } from "next/server";
import { validateUrl } from "@/lib/analyzer/fetch-html";
import { runDiagnosis } from "@/lib/analyzer";
import type { DiagnoseRequest, SSEEvent } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// レート制限（メモリベース・簡易実装）
const rateMap = new Map<string, number[]>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 5;
  const hits = (rateMap.get(ip) ?? []).filter((t) => now - t < window);
  hits.push(now);
  rateMap.set(ip, hits);
  return hits.length <= limit;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!checkRate(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. 1分間に5回まで。" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: DiagnoseRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  // URLバリデーション（サーバーサイドでも必ず再検証）
  try {
    validateUrl(body.url);
  } catch {
    return new Response(JSON.stringify({ error: "無効なURLです。" }), { status: 400 });
  }

  // SSE ストリーム
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch { /* closed */ }
      };

      await runDiagnosis(body, send);

      try {
        controller.close();
      } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
