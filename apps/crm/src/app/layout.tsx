import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "REACH — AI-Native Mini CRM",
  description:
    "AI-powered CRM for D2C brands. Segment audiences, draft personalized messages, and track campaigns in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${playfair.variable} font-sans antialiased bg-[#F7F4EF] text-[#0F1B2D]`}
      >
        <Toaster position="bottom-right" />
        {children}
      </body>
    </html>
  );
}
