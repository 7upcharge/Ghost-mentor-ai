import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ghost Mentor AI — Your Future Self, Now",
  description:
    "An autonomous AI life co-pilot that simulates your future self. Get emotionally intelligent, predictive, and brutally personalized mentorship from the person you could become.",
  keywords: [
    "AI mentor",
    "future self",
    "life coaching",
    "AI advisor",
    "personal growth",
    "decision support",
  ],
  openGraph: {
    title: "Ghost Mentor AI — Your Future Self, Now",
    description:
      "What if your future self could guide your present decisions?",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-ghost-bg text-ghost-text overflow-x-hidden" suppressHydrationWarning>
        {/* Single, barely-visible ambient wash — no animation, no theatrics */}
        <div className="ambient-layer" aria-hidden="true" />
        <main className="relative z-10 flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
