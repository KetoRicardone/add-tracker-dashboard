"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ListChecks,
  Settings2,
  Users,
  ShieldCheck,
  PackageSearch,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  MonitorSmartphone,
  Building2,
  Wheat,
} from "lucide-react";
import { LoginControl } from "./LoginControl";
import { cn } from "@/lib/utils";

// Cada entrada declara el permiso de ámbito PANEL que la habilita (F0_018).
const adminChildren = [
  { tab: "usuarios", label: "Usuarios", icon: Users, permiso: "PANEL_USUARIOS" },
  { tab: "permisos", label: "Roles", icon: ShieldCheck, permiso: "PANEL_ROLES" },
  { tab: "precintos", label: "Precintos", icon: PackageSearch, permiso: "PANEL_PRECINTOS" },
  { tab: "establecimientos", label: "Establecimientos", icon: Building2, permiso: "PANEL_ESTABLECIMIENTOS" },
  { tab: "granos", label: "Granos", icon: Wheat, permiso: "PANEL_GRANOS" },
];

export function Sidebar({ nombre, permisos }: { nombre: string | null; permisos: string[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false); // drawer mobile
  const onAdmin = pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(onAdmin);
  const loggedIn = !!nombre; // sin sesión no se muestran los accesos

  const puede = (p: string) => permisos.includes(p);
  const hijosVisibles = adminChildren.filter((c) => puede(c.permiso));
  const verAdmin = puede("PANEL_ADMIN") && hijosVisibles.length > 0;
  const currentTab = searchParams.get("tab") || hijosVisibles[0]?.tab || "usuarios";

  const Logo = () => (
    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">A</span>
      <span>ADD Tracker</span>
    </Link>
  );

  const linkClass = (activo: boolean, indent = false) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      indent && "py-1.5 text-[13px]",
      activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

  // Manuales en PDF — solo con sesión (los archivos también los protege el middleware).
  const Manuales = () => {
    if (!loggedIn) return null;
    return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Manuales
      </p>
      <a
        href="/manuales/Manual_Bot_ADD_Tracker.pdf"
        target="_blank"
        rel="noopener"
        className={linkClass(false, true)}
      >
        <BookOpen className="h-3.5 w-3.5" /> Manual del bot (PDF)
      </a>
      <a
        href="/manuales/Manual_Panel_ADD_Tracker.pdf"
        target="_blank"
        rel="noopener"
        className={linkClass(false, true)}
      >
        <MonitorSmartphone className="h-3.5 w-3.5" /> Manual del panel (PDF)
      </a>
    </div>
    );
  };

  const Nav = () => {
    if (!loggedIn) {
      return (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Iniciá sesión para acceder al panel.
        </p>
      );
    }
    return (
    <nav className="flex flex-col gap-1">
      {puede("PANEL_TRAZABILIDAD") && (
        <Link href="/" onClick={() => setOpen(false)} className={linkClass(pathname === "/")}>
          <LayoutDashboard className="h-4 w-4" /> Panel de control
        </Link>
      )}
      {puede("PANEL_EVENTOS") && (
        <Link href="/eventos" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/eventos"))}>
          <ListChecks className="h-4 w-4" /> Eventos
        </Link>
      )}

      {verAdmin && (
        <div>
          <button onClick={() => setAdminOpen((v) => !v)} className={cn(linkClass(onAdmin), "w-full justify-between")}>
            <span className="flex items-center gap-3">
              <Settings2 className="h-4 w-4" /> Administración
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", adminOpen && "rotate-180")} />
          </button>
          {adminOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-2">
              {hijosVisibles.map((c) => {
                const Icon = c.icon;
                const activo = onAdmin && currentTab === c.tab;
                return (
                  <Link
                    key={c.tab}
                    href={`/admin?tab=${c.tab}`}
                    onClick={() => setOpen(false)}
                    className={linkClass(activo, true)}
                  >
                    <Icon className="h-3.5 w-3.5" /> {c.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
    );
  };

  return (
    <>
      {/* Sidebar fijo en desktop */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="mb-6 px-1">
          <Logo />
        </div>
        <Nav />
        <Manuales />
        <div className="mt-auto border-t border-border pt-4">
          <LoginControl nombre={nombre} />
        </div>
      </aside>

      {/* Barra superior en mobile */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo />
        <LoginControl nombre={nombre} />
      </header>

      {/* Drawer en mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center justify-between px-1">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Nav />
            <Manuales />
          </aside>
        </div>
      )}
    </>
  );
}
