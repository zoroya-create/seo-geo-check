"use client";
import type { Grade } from "@/lib/types";

const gradeStyle: Record<Grade, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-grade-a-bg", text: "text-grade-a", label: "優秀" },
  B: { bg: "bg-grade-b-bg", text: "text-grade-b", label: "良好" },
  C: { bg: "bg-grade-c-bg", text: "text-grade-c", label: "要改善" },
  D: { bg: "bg-grade-d-bg", text: "text-grade-d", label: "緊急対応" },
  "N/A": { bg: "bg-gray-100", text: "text-gray-400", label: "未実施" },
};

export function GradeBadge({ grade, size = "md" }: { grade: Grade; size?: "sm" | "md" | "lg" }) {
  const s = gradeStyle[grade] ?? gradeStyle["N/A"];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-xl px-4 py-1.5 font-black" : "text-sm px-3 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${s.bg} ${s.text} ${sizeClass}`}>
      {grade}
      {size !== "sm" && <span className="opacity-70 font-normal text-xs">{s.label}</span>}
    </span>
  );
}
