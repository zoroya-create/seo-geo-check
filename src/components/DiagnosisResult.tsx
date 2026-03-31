"use client";
import { useState } from "react";
import {
  Download, RefreshCw, AlertCircle, ChevronDown, ChevronUp,
  Search, MapPin, Bot, Share2, Shield, Cpu, Building2, Gauge,
} from "lucide-react";
import type { DiagnosisResult, AxisResult } from "@/lib/types";
import { GradeBadge } from "./Gradebadge";
import { CheckTable } from "./CheckTable";
import { DiagnosisRadar } from "./DiagnosisRadar";

const AXIS_CONFIG = [
  { key: "seo", label: "SEO", icon: Search, desc: "タイトル・見出し・キーワード最適化" },
  { key: "meo", label: "MEO（ローカル）", icon: MapPin, desc: "ローカル検索・Googleマップ対応" },
  { key: "aio", label: "AIO / GEO / LLMO", icon: Bot, desc: "AI検索エンジン対応" },
  { key: "ogp", label: "OGP / SNS", icon: Share2, desc: "SNSシェア最適化" },
  { key: "eeat", label: "E-E-A-T", icon: Shield, desc: "信頼性・専門性・権威性" },
  { key: "techQuality", label: "技術品質", icon: Cpu, desc: "robots・sitemap・HTTPS等" },
  { key: "nap", label: "NAP一貫性", icon: Building2, desc: "社名・住所・電話番号の統一" },
  { key: "psi", label: "表示速度", icon: Gauge, desc: "PageSpeed Insights スコア" },
] as const;

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 85 ? "#16a34a" : score >= 65 ? "#2563EB" : score >= 40 ? "#D97706" : "#DC2626";
  return (
    <svg width="120" height="120" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x="55" y="52" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}</text>
      <text x="55" y="67" textAnchor="middle" fontSize="9" fill="#9CA3AF">/ 100</text>
    </svg>
  );
}

function AxisCard({ axisKey, label, icon: Icon, desc, axis, isActive, onClick }: {
  axisKey: string; label: string; icon: React.ElementType; desc: string;
  axis: AxisResult; isActive: boolean; onClick: () => void;
}) {
  const gradeColors: Record<string, string> = {
    A: "border-grade-a", B: "border-grade-b", C: "border-grade-c", D: "border-grade-d", "N/A": "border-gray-200"
  };
  const borderCls = gradeColors[axis.grade] ?? "border-gray-200";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        isActive
          ? "border-coconala-purple bg-coconala-purple-light shadow-card-hover"
          : `${borderCls} bg-white hover:shadow-card`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${isActive ? "bg-coconala-purple text-white" : "bg-gray-100 text-gray-500"}`}>
            <Icon size={14} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">{label}</div>
            <div className="text-xs text-gray-400 hidden sm:block">{desc}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <GradeBadge grade={axis.grade} size="sm" />
          <span className="text-xs font-bold text-gray-600">{axis.score}点</span>
        </div>
      </div>
    </button>
  );
}

function IssueList({ result }: { result: DiagnosisResult }) {
  const issues = Object.entries(result.axes).flatMap(([, axis]) =>
    axis.checks
      .filter((c) => c.status === "ng" || c.status === "warn")
      .map((c) => ({ ...c, axisKey: "" }))
  ).sort((a, b) => {
    const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });

  const priorityCls: Record<string, string> = {
    high: "bg-red-50 text-red-600 border-red-100",
    medium: "bg-amber-50 text-amber-700 border-amber-100",
    low: "bg-gray-50 text-gray-500 border-gray-100",
  };
  const priorityLabel: Record<string, string> = { high: "高", medium: "中", low: "低" };

  return (
    <div className="space-y-2">
      {issues.slice(0, 20).map((issue, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${priorityCls[issue.priority]}`}>
            {priorityLabel[issue.priority]}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800">{issue.label}</div>
            {issue.suggestion && (
              <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{issue.suggestion}</div>
            )}
          </div>
        </div>
      ))}
      {issues.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
          問題は見つかりませんでした
        </div>
      )}
    </div>
  );
}

export function DiagnosisResultView({
  result,
  onReset,
}: {
  result: DiagnosisResult;
  onReset: () => void;
}) {
  const [activeAxis, setActiveAxis] = useState<string>("seo");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const activeAxisData = result.axes[activeAxis as keyof typeof result.axes];

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error("PDF生成失敗");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const domain = new URL(result.meta.url).hostname;
      a.download = `seo-report-${domain}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
    } catch {
      alert("PDFの生成に失敗しました。");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">
            診断日時: {new Date(result.meta.diagnosedAt).toLocaleString("ja-JP")}
          </div>
          <h2 className="text-lg font-bold text-gray-900 break-all">{result.meta.url}</h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handlePDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-coconala-purple text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-coconala-purple-dark transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            {pdfLoading ? "生成中..." : "PDFダウンロード"}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={14} />
            再診断
          </button>
        </div>
      </div>

      {/* 総合スコア + レーダー */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          {/* スコア */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={result.summary.totalScore} />
            <div>
              <div className="text-sm text-gray-500 mb-1">総合グレード</div>
              <GradeBadge grade={result.summary.grade} size="lg" />
              <div className="text-xs text-gray-400 mt-2">
                8軸の平均スコアを総合評価
              </div>
            </div>
          </div>
          {/* レーダー */}
          <DiagnosisRadar result={result} />
        </div>
      </div>

      {/* 軸別スコアカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {AXIS_CONFIG.map((cfg) => {
          const axis = result.axes[cfg.key];
          return (
            <AxisCard
              key={cfg.key}
              axisKey={cfg.key}
              label={cfg.label}
              icon={cfg.icon}
              desc={cfg.desc}
              axis={axis}
              isActive={activeAxis === cfg.key}
              onClick={() => setActiveAxis(cfg.key)}
            />
          );
        })}
      </div>

      {/* 詳細チェックテーブル */}
      {activeAxisData && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">
              {AXIS_CONFIG.find((c) => c.key === activeAxis)?.label} 詳細
            </h3>
            <GradeBadge grade={activeAxisData.grade} />
          </div>
          <CheckTable checks={activeAxisData.checks} />
        </div>
      )}

      {/* 改善アクションリスト */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">改善アクションリスト</h3>
          <button
            onClick={() => setShowAllIssues(!showAllIssues)}
            className="flex items-center gap-1 text-xs text-coconala-purple"
          >
            {showAllIssues ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAllIssues ? "折りたたむ" : "すべて表示"}
          </button>
        </div>
        <IssueList result={result} />
      </div>
    </div>
  );
}
