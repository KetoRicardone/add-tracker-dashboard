"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ListChecks, Settings2, Menu, X } from "lucide-react";
import { LoginControl } from "./LoginControl";
import { cn } from "@/lib/utils";

export function Sidebar({ nombre, isAdmin }: { nombre: string | null; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/eventos", label: "Eventos", icon: ListChecks },
    ...(isAdmin ? [{ href: "/admin", label: "Administración", icon: Settings2 }] : []),
  ];
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const Logo = () => (
    <Link
      href="/"
      onClick={() => setOpen(false)}
      className="flex items-center gap-2 text-lg font-semibold tracking-tight"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
        A
      </span>
      <span>ADD Tracker</span>
    </Link>
  );

  const Nav = () => (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active(it.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

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
