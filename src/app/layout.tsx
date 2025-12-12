import "./globals.css";
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next";

if (process.env.NODE_ENV !== "production") {
  const globalAny = globalThis as any;
  globalAny.litIssuedWarnings ??= new Set<string>();
  globalAny.litIssuedWarnings.add("dev-mode");
}

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cliplore",
  description:
    "Sora-powered, onchain-aware video editor for generating, editing, and licensing IP directly from the browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="lit-dev-mode-suppress" strategy="beforeInteractive">
          {`window.litIssuedWarnings = window.litIssuedWarnings || new Set();
window.litIssuedWarnings.add('dev-mode');`}
        </Script>
      </head>
      <body
        className={`min-h-screen flex flex-col bg-background text-foreground font-sans antialiased ${geistSans.variable} ${geistMono.variable}`}
      >
        <Providers>
          <Header />
          <main id="main" className="flex-grow">
            <Toaster
              toastOptions={{
                style: {
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                },
              }}
            />
            {children}
            <Analytics />
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
