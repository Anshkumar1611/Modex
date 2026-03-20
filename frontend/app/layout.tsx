import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "@/contexts/BookingContext";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Modex — Doctor appointments",
  description: "Book a visit. Seats are held safely with real-time availability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dm.variable}`}>
      <body className="font-sans min-h-screen">
        <BookingProvider>
          <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <a
                href="/"
                className="font-display text-xl font-bold tracking-tight text-clinic"
              >
                Modex
              </a>
              <nav className="flex gap-6 text-sm font-medium text-ink/70">
                <a href="/" className="hover:text-clinic transition-colors">
                  Slots
                </a>
                <a href="/admin" className="hover:text-clinic transition-colors">
                  Admin
                </a>
              </nav>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
        </BookingProvider>
      </body>
    </html>
  );
}
