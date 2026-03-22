import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-serif-kr",
});

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "필마 筆魔 - 웹소설 전용 에디터",
  description: "집중을 위한 웹소설 전용 로컬 에디터",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "필마",
  },
};

export const viewport: Viewport = {
  themeColor: "#4a8c5c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSerifKr.variable} font-pretendard antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="green" themes={['green', 'dark', 'light']} enableSystem={false}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
