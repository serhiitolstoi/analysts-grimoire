import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { SimulationController } from "@/components/layout/simulation-controller";

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
          <div className="flex h-full">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content area */}
            <main
              className="flex-1 overflow-hidden flex flex-col"
              style={{ paddingBottom: "var(--spacing-controller)" }}
            >
              {children}
            </main>
          </div>

          {/* Global simulation controller — fixed bottom bar */}
          <SimulationController />
        </Providers>
      </body>
    </html>
  );
}
