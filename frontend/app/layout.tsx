import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="font-sans min-h-screen flex flex-col">
        <BookingProvider>
          <header className="sticky top-0 z-50 border-b border-line bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-clinic/25 to-transparent" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
              <Link
                href="/"
                className="flex items-center gap-3 group"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clinic to-clinic/80 text-white shadow-soft group-hover:shadow-lift transition-shadow">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <div className="leading-tight">
                  <span className="font-display text-lg font-bold tracking-tight text-ink block">
                    Modex
                  </span>
                  <span className="text-[11px] font-medium text-clinicMuted tracking-wide uppercase">
                    Care scheduling
                  </span>
                </div>
              </Link>
              <nav className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-ink/70 hover:text-clinic hover:bg-clinicLight/60 transition-colors"
                >
                  Visits
                </Link>
                <Link
                  href="/admin"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-ink/70 hover:text-clinic hover:bg-clinicLight/60 transition-colors"
                >
                  Admin
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14">
            {children}
          </main>
          <footer className="border-t border-line mt-auto py-8 text-center text-xs text-ink/40">
            Real-time availability · Secure holds · Modex demo
          </footer>
        </BookingProvider>
      </body>
    </html>
  );
}
