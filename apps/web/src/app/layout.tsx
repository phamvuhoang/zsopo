import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lexend } from "next/font/google";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { env } from "@/lib/env";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin", "vietnamese"], variable: "--font-display" });
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "ZSOPO", template: "%s | ZSOPO" },
  description: "ZSOPO: Space, Connect, Give. Lưu trú, sản phẩm năng lượng và cộng đồng tại Đà Lạt.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${lexend.variable} ${beVietnam.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
