import type { Metadata } from "next";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Sidebar } from "@/components/Sidebar";
import { getSesion, esAdmin } from "@/lib/auth";
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
        <Sidebar nombre={sesion?.nombre ?? null} isAdmin={esAdmin(sesion)} />
        <div className="flex min-h-screen flex-col md:pl-60">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-[4.5rem] md:px-8 md:pt-8">
            {children}
          </main>
          <AutoRefresh intervalSeconds={30} />
          <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
            ADD Tracker — Anta del Dorado S.A. — {new Date().getFullYear()}
          </footer>
        </div>
      </body>
    </html>
  );
}
