import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Header } from "@/components/header";
import { SITE_CONFIG } from "@/lib/config";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} — Número de Graham para ações da B3`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description:
    "Calcule e entenda o Número de Graham de ações brasileiras com dados, fórmula e limitações apresentados de forma clara.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="site-frame">
          <Header />
          {children}
          <footer className="site-footer">
            <div className="page-shell footer-inner">
              <p>© {new Date().getFullYear()} {SITE_CONFIG.name}</p>
              <p>Informação clara para decisões mais conscientes.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
