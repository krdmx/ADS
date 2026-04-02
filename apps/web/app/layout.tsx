import { Manrope, Raleway } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Raleway({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Fitev Application Workspace",
  description:
    "Tailor resumes, track applications, and keep interview context in one workspace.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
