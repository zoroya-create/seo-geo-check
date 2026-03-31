"use client";
import type { CheckItem } from "@/lib/types";

const statusConfig = {
  ok: { icon: "✅", label: "OK", cls: "text-grade-a" },
  ng: { icon: "❌", label: "NG", cls: "text-grade-d" },
  warn: { icon: "⚠️", label: "警告", cls: "text-grade-c" },
  skip: { icon: "—", label: "スキップ", cls: "text-gray-400" },
};

const priorityConfig = {
  high: { label: "高", cls: "bg-red-50 text-red-600" },
  medium: { label: "中", cls: "bg-yellow-50 text-yellow-700" },
  low: { label: "低", cls: "bg-gray-50 text-gray-500" },
};

export function CheckTable({ checks }: { checks: CheckItem[] }) {
  const visible = checks.filter((c) => c.status !== "skip" || c.maxScore > 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">チェック項目</th>
            <th className="px-3 py-3 text-center font-semibold w-20">状態</th>
            <th className="px-3 py-3 text-center font-semibold w-16">優先度</th>
            <th className="px-4 py-3 text-left font-semibold">検出値</th>
            <th className="px-4 py-3 text-left font-semibold">改善提案</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {visible.map((c) => {
            const st = statusConfig[c.status];
            const pr = priorityConfig[c.priority];
            return (
              <tr key={c.id} className={`${c.status === "ng" ? "bg-red-50/30" : c.status === "warn" ? "bg-amber-50/30" : "bg-white"} hover:bg-gray-50/50 transition-colors`}>
                <td className="px-4 py-3 font-medium text-gray-800">{c.label}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-base ${st.cls}`}>{st.icon}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {c.status !== "skip" && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pr.cls}`}>
                      {pr.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={c.detectedValue}>
                  {c.detectedValue ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-coconala-purple leading-relaxed">
                  {c.suggestion ?? (c.status === "ok" ? <span className="text-grade-a">問題ありません</span> : "—")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
