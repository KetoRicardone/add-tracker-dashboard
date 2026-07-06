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
} from "lucide-react";
import { LoginControl } from "./LoginControl";
import { cn } from "@/lib/utils";

const adminChildren = [
  { tab: "usuarios", label: "Usuarios", icon: Users },
  { tab: "permisos", label: "Roles", icon: ShieldCheck },
  { tab: "precintos", label: "Precintos", icon: PackageSearch },
];

export function Sidebar({ nombre, isAdmin }: { nombre: string | null; isAdmin: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false); // drawer mobile
  const onAdmin = pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(onAdmin);
  const currentTab = searchParams.get("tab") || "usuarios";
  const loggedIn = !!nombre; // sin sesión no se muestran los accesos

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
      <Link href="/" onClick={() => setOpen(false)} className={linkClass(pathname === "/")}>
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </Link>
      <Link href="/eventos" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/eventos"))}>
        <ListChecks className="h-4 w-4" /> Eventos
      </Link>

      {isAdmin && (
        <div>
          <button onClick={() => setAdminOpen((v) => !v)} className={cn(linkClass(onAdmin), "w-full justify-between")}>
            <span className="flex items-center gap-3">
              <Settings2 className="h-4 w-4" /> Administración
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", adminOpen && "rotate-180")} />
          </button>
          {adminOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-2">
              {adminChildren.map((c) => {
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
          </aside>
        </div>
      )}
    </>
  );
}
