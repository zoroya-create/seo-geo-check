import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO/GEO 多軸診断ツール | ぞろ屋",
  description: "URLを入力するだけで SEO・MEO・AIO/GEO/LLMO・OGP・E-E-A-T・技術品質・NAP・表示速度の8軸で自動診断。結果をPDFでダウンロードできます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
