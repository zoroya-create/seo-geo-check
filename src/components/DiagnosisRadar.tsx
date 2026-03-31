"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DiagnosisResult } from "@/lib/types";

const AXIS_LABELS: Record<string, string> = {
  seo: "SEO",
  meo: "MEO",
  aio: "AIO/GEO",
  ogp: "OGP/SNS",
  eeat: "E-E-A-T",
  techQuality: "技術品質",
  nap: "NAP",
  psi: "表示速度",
};

export function DiagnosisRadar({ result }: { result: DiagnosisResult }) {
  const data = Object.entries(result.axes).map(([key, axis]) => ({
    subject: AXIS_LABELS[key] ?? key,
    score: axis.score,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 600 }}
        />
        <Tooltip
          formatter={(val: number) => [`${val}点`, "スコア"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }}
        />
        <Radar
          name="スコア"
          dataKey="score"
          stroke="#5C35D9"
          fill="#5C35D9"
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ fill: "#5C35D9", r: 3 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
