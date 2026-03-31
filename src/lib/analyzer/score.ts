import type { AxisResult, CheckItem, Grade, PSIAxisResult, PSIOpportunity } from "../types";

export function calcGrade(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 65) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function buildAxisResult(checks: CheckItem[], opportunities?: PSIOpportunity[]): AxisResult {
  const earned = checks.reduce((s, c) => s + c.score, 0);
  const max = checks.reduce((s, c) => s + c.maxScore, 0);
  const score = max === 0 ? 0 : Math.round((earned / max) * 100);
  const grade = calcGrade(score);

  const topIssues = checks
    .filter((c) => c.status === "ng" || c.status === "warn")
    .sort((a, b) => {
      const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    })
    .slice(0, 3)
    .map((c) => c.suggestion ?? c.label);

  if (opportunities !== undefined) {
    return { score, grade, checks, topIssues, opportunities } as PSIAxisResult;
  }
  return { score, grade, checks, topIssues };
}
