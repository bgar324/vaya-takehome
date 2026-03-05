import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const bodySans = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vaya Take Home",
  description: "Take-home mentions input demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodySans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
