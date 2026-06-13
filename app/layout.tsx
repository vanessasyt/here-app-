import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-hanken",
});

export const metadata: Metadata = {
  title: "here.",
  description: "Meet in the moment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hanken.variable}>
      <body style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
