"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Search, MapPin, Bot, Share2, Shield, Cpu, Building2, Gauge } from "lucide-react";
import { URLInputForm } from "@/components/URLInputForm";
import { DiagnosisProgress } from "@/components/DiagnosisProgress";
import { DiagnosisResultView } from "@/components/DiagnosisResult";
import type { DiagnoseRequest, DiagnosisResult, ProgressEvent } from "@/lib/types";

type Phase = "input" | "loading" | "result" | "error";

const FEATURES = [
  { icon: Search, label: "SEO", desc: "title・meta・見出し" },
  { icon: MapPin, label: "MEO", desc: "ローカル検索・Gマップ" },
  { icon: Bot, label: "AIO / GEO / LLMO", desc: "AI検索エンジン対応" },
  { icon: Share2, label: "OGP / SNS", desc: "SNSシェア最適化" },
  { icon: Shield, label: "E-E-A-T", desc: "信頼性・専門性" },
  { icon: Cpu, label: "技術品質", desc: "robots・sitemap・HTTPS" },
  { icon: Building2, label: "NAP一貫性", desc: "社名・住所・電話" },
  { icon: Gauge, label: "表示速度", desc: "PageSpeed Insights" },
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [diagUrl, setDiagUrl] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  const handleDiagnose = async (req: DiagnoseRequest) => {
    setPhase("loading");
    setProgress(null);
    setDiagUrl(req.url);

    let aborted = false;
    abortRef.current = () => { aborted = true; };

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "診断APIエラー");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          try {
            const event = JSON.parse(raw);
            if (event.type === "progress") {
              setProgress(event as ProgressEvent);
            } else if (event.type === "complete") {
              setResult(event.result as DiagnosisResult);
              setPhase("result");
              return;
            } else if (event.type === "error") {
              throw new Error(event.message ?? "診断中にエラーが発生しました");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err: unknown) {
      if (!aborted) {
        setErrorMsg(err instanceof Error ? err.message : "予期しないエラーが発生しました");
        setPhase("error");
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.();
    setPhase("input");
  };

  const handleReset = () => {
    setPhase("input");
    setProgress(null);
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Image
            src="/zoroya-logo.png"
            alt="ぞろ屋"
            width={120}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {phase === "input" && (
          <div className="space-y-10">
            {/* ヒーローセクション */}
            <div className="text-center space-y-4 pt-4">
              <div className="inline-flex items-center gap-2 bg-coconala-purple-light text-coconala-purple px-4 py-2 rounded-full text-xs font-semibold">
                <Bot size={12} />
                AI検索（GEO / AIO / LLMO）対応
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
                URLを入力するだけで<br />
                <span className="text-coconala-purple">8軸</span>で自動診断
              </h1>
              <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
                SEO・MEO・AI検索・OGP・信頼性・技術品質・NAP・表示速度を一括チェック。
                結果はPDFで即ダウンロードできます。
              </p>
            </div>

            {/* フォーム */}
            <URLInputForm onSubmit={handleDiagnose} />

            {/* 8軸グリッド */}
            <div>
              <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
                診断する8つの軸
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.label}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-coconala-purple-light flex items-center justify-center">
                      <f.icon size={16} className="text-coconala-purple" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{f.label}</div>
                      <div className="text-xs text-gray-400">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "loading" && (
          <DiagnosisProgress progress={progress} url={diagUrl} onCancel={handleCancel} />
        )}

        {phase === "result" && result && (
          <DiagnosisResultView result={result} onReset={handleReset} />
        )}

        {phase === "error" && (
          <div className="max-w-lg mx-auto text-center space-y-6 pt-16">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">診断に失敗しました</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="bg-coconala-purple text-white px-8 py-3 rounded-xl font-semibold hover:bg-coconala-purple-dark transition-colors"
            >
              もう一度試す
            </button>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-100 py-6 mt-16">
        <p className="text-center text-xs text-gray-400">
          © 2026 勝てるホームページ作成会社 ぞろ屋
        </p>
      </footer>
    </div>
  );
}
