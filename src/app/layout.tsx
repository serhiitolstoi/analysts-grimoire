import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { ClientLayout } from "@/components/layout/client-layout";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Analyst's Grimoire",
  description: "Product Analytics Flight Simulator — Advanced methodology workspace for Senior Product Analysts",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="h-full overflow-hidden bg-g-bg text-g-text font-mono">
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
