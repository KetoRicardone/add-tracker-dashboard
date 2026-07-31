import type { Metadata } from "next";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Sidebar } from "@/components/Sidebar";
import { getSesion } from "@/lib/auth";
import { permisosPanel } from "@/lib/permisos";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ADD Tracker — Panel de control",
  description: "Trazabilidad operacional de granos — Anta del Dorado S.A.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sesion = getSesion();
  // El menú lateral se arma con los permisos de ámbito PANEL del rol (F0_018).
  const permisos = Array.from(await permisosPanel(sesion));
  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Sidebar nombre={sesion?.nombre ?? null} permisos={permisos} />
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
