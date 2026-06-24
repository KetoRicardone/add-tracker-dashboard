import type { Metadata } from "next";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LoginControl } from "@/components/LoginControl";
import { getSesion } from "@/lib/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ADD Tracker — Dashboard",
  description: "Trazabilidad operacional de granos — Anta del Dorado S.A.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sesion = getSesion();
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-14 items-center justify-between px-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                  A
                </span>
                <span>ADD Tracker</span>
              </a>
              <nav className="flex items-center gap-1 text-sm">
                <a href="/" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  Dashboard
                </a>
                <a href="/eventos" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  Eventos
                </a>
                <div className="ml-2 pl-2 border-l border-border">
                  <LoginControl nombre={sesion?.nombre ?? null} />
                </div>
              </nav>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
          <AutoRefresh intervalSeconds={30} />
          <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
            ADD Tracker — Anta del Dorado S.A. — {new Date().getFullYear()}
          </footer>
        </div>
      </body>
    </html>
  );
}
