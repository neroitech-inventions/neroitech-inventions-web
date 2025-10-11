import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./legacy.css";
// Styles for @solana/wallet-adapter-react-ui modal/buttons
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletProviders } from "@/components/wallet/WalletProviders";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Inter } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "auto",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SnappQuest",
  description: "Engage-to-Earn Quest Platform Prototype on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <WalletProviders>
          <Navbar />
          <div className="min-h-screen">{children}</div>
          <Footer />
        </WalletProviders>
      </body>
    </html>
  );
}
