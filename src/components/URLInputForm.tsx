"use client";
import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { DiagnoseRequest } from "@/lib/types";

interface Props {
  onSubmit: (req: DiagnoseRequest) => void;
  loading?: boolean;
}

export function URLInputForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("seo_last_url") ?? "";
    return "";
  });
  const [showSpec, setShowSpec] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [tel, setTel] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [urlError, setUrlError] = useState("");

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setKwInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) { setUrlError("URLを入力してください。"); return; }
    try {
      const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      setUrlError("正しいURLを入力してください（例: https://example.com）");
      return;
    }
    setUrlError("");
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    localStorage.setItem("seo_last_url", normalized);

    const spec = {
      businessName: businessName.trim() || undefined,
      address: address.trim() || undefined,
      tel: tel.trim() || undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
    };
    const hasSpec = Object.values(spec).some((v) => v !== undefined);

    onSubmit({ url: normalized, spec: hasSpec ? spec : undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
      {/* URL入力 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
          placeholder="https://example.com"
          className={`w-full pl-11 pr-4 py-4 text-base rounded-2xl border-2 outline-none transition-all bg-white shadow-sm ${
            urlError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-coconala-purple"
          }`}
          disabled={loading}
          autoFocus
        />
        {urlError && (
          <p className="text-red-500 text-xs mt-1.5 pl-1">{urlError}</p>
        )}
      </div>

      {/* SPEC（任意）アコーディオン */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSpec(!showSpec)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>精度向上オプション（SPEC情報・任意）</span>
          {showSpec ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSpec && (
          <div className="px-5 pb-5 grid sm:grid-cols-2 gap-4 border-t border-gray-50">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ビジネス名</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="株式会社〇〇"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-coconala-purple outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">電話番号</label>
              <input
                type="text"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="03-1234-5678"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-coconala-purple outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">住所</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="東京都〇〇区〇〇1-2-3"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-coconala-purple outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ターゲットキーワード</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  placeholder="キーワードを追加"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-coconala-purple outline-none"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-3 py-2 bg-coconala-purple-light text-coconala-purple rounded-xl text-sm font-semibold hover:bg-coconala-purple hover:text-white transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 bg-coconala-purple-light text-coconala-purple px-3 py-1 rounded-full text-xs font-semibold">
                      {kw}
                      <button type="button" onClick={() => setKeywords(keywords.filter((k) => k !== kw))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-coconala-purple to-coconala-teal text-white font-bold text-base rounded-2xl shadow-md hover:shadow-lg hover:from-coconala-purple-dark hover:to-coconala-teal transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "診断中..." : "無料で診断する →"}
      </button>
    </form>
  );
}
