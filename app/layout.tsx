import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import "@/app/globals.css";
import { Navbar } from "@/components/navbar";
import { analytics, buildMainSiteFriendUrl, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Galgame Guide",
    "Galgame 索引",
    "视觉小说目录",
    "作品标签",
    "游戏版本情报",
    "视觉小说",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: "website",
    locale: "zh_CN",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  verification: {
    google: "1Xgn-if-N3BE_rT0R4tVMRVNQH8ouKq1y7suby_9vjM",
    yandex: "ca96ec0d870b3e63",
    other: {
      "6a97888e-site-verification": "bd9f36257c1bd922ea53f45d0aaac602",
    },
  },
};

function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/40 py-12 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="font-display text-xl text-ink-strong">{siteConfig.name}</h3>
            <p className="text-sm leading-6 text-ink-soft">
              独立的视觉小说与 Galgame 作品发现索引，只展示来源已有字段和经过核验的编辑信息。
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">快速导航</h4>
            <ul className="grid gap-2 text-sm text-ink-soft">
              <li><Link href="/" className="hover:text-accent">网站首页</Link></li>
              <li><Link href="/archive" className="hover:text-accent">作品索引</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">关于与合规</h4>
            <ul className="grid gap-2 text-sm text-ink-soft">
              <li><Link href="/about" className="hover:text-accent">关于我们</Link></li>
              <li><Link href="/privacy" className="hover:text-accent">隐私政策</Link></li>
              <li><Link href="/terms" className="hover:text-accent">服务条款</Link></li>
              <li><Link href="/contact" className="hover:text-accent">免责声明</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">合作伙伴</h4>
            <p className="text-sm text-ink-soft">
              Galgame Guide 独立提供发现与索引功能。外部合作站点仅作为普通友链列出。
            </p>
            <a
              href={buildMainSiteFriendUrl()}
              target="_blank"
              rel="noopener"
              className="inline-flex text-sm text-accent hover:underline"
            >
              KrzACG 社区 ↗
            </a>
          </div>
        </div>
        <div className="mt-12 border-t border-white/5 pt-8 text-center text-xs text-white/30">
          <p>© {new Date().getFullYear()} Galgame Guide. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        {children}
        <Footer />
        <Script
          strategy="lazyOnload"
          src={analytics.scriptSrc}
          data-website-id={analytics.websiteId}
        />
      </body>
    </html>
  );
}
