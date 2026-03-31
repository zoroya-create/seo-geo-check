"use client";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import type { ProgressEvent } from "@/lib/types";

const STEP_LABELS = [
  "HTMLを取得",
  "SEO 診断",
  "MEO 診断",
  "AIO / GEO / LLMO 診断",
  "OGP / SNS 診断",
  "E-E-A-T 診断",
  "技術品質 診断",
  "NAP一貫性 診断",
  "PageSpeed Insights 取得",
];

export function DiagnosisProgress({
  progress,
  url,
  onCancel,
}: {
  progress: ProgressEvent | null;
  url: string;
  onCancel: () => void;
}) {
  const currentStep = progress?.step ?? 0;
  const percent = progress?.percent ?? 0;

  return (
    <div className="max-w-xl mx-auto">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-coconala-purple-light text-coconala-purple px-4 py-2 rounded-full text-sm font-semibold mb-4">
          <Loader2 size={14} className="animate-spin" />
          診断中...
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">サイトを解析しています</h2>
        <p className="text-sm text-gray-500 truncate max-w-sm mx-auto">{url}</p>
      </div>

      {/* プログレスバー */}
      <div className="bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coconala-purple to-coconala-teal transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-8">
        <span>{progress?.message ?? "準備中..."}</span>
        <span>{percent}%</span>
      </div>

      {/* ステップリスト */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-3">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <div key={step} className="flex items-center gap-3">
              {done ? (
                <CheckCircle size={18} className="text-grade-a shrink-0" />
              ) : active ? (
                <Loader2 size={18} className="animate-spin text-coconala-purple shrink-0" />
              ) : (
                <Circle size={18} className="text-gray-200 shrink-0" />
              )}
              <span
                className={`text-sm ${done ? "text-gray-400 line-through" : active ? "text-gray-900 font-semibold" : "text-gray-300"}`}
              >
                {label}
              </span>
              {done && progress && (
                <span className="ml-auto text-xs text-grade-a font-medium">完了</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
