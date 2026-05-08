import type { Metadata } from "next";
import { Kanit } from "next/font/google";

import "./globals.css";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  title: "Yaksha Manga",
  description: "Free manga reading platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className={kanit.className}>{children}</body>
    </html>
  );
}
