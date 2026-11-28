import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/i18n/provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

function resolveMetadataBase(): URL {
  const candidates = [
    process.env.BLOUMEID_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "https://id.bloume.fr",
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      return new URL(trimmed);
    } catch {
      // Ignore malformed env override and fall back to next candidate
    }
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "BloumeID — Self-Hosted Fingerprinting & Threat Intelligence",
  description:
    "Deterministic visitor fingerprinting, bot & anti-spoof detection, and network threat intelligence by Bloume SAS.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "BloumeID — Self-Hosted Fingerprinting & Threat Intelligence",
    description:
      "Deterministic visitor fingerprinting, bot & anti-spoof detection, and network threat intelligence by Bloume SAS.",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BloumeID — Self-Hosted Fingerprinting & Threat Intelligence",
    description:
      "Deterministic visitor fingerprinting, bot & anti-spoof detection, and network threat intelligence by Bloume SAS.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
