import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ghost Mentor AI — Your Future Self, Now",
  description:
    "An emotionally continuous future-self simulation that maintains a persistent profile of your patterns, fears, ambitions, and growth across sessions.",
  keywords: [
    "AI mentor",
    "future self",
    "emotional continuity",
    "future-self memory",
    "personal growth",
    "decision support",
  ],
  openGraph: {
    title: "Ghost Mentor AI — Your Future Self, Now",
    description:
      "A future-self simulation with persistent emotional memory and psychological continuity.",
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
        <AuthProvider>
          {/* Single, barely-visible ambient wash — no animation, no theatrics */}
          <div className="ambient-layer" aria-hidden="true" />
          <main className="relative z-10 flex-1 flex flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
