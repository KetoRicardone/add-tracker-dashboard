import { ShieldAlert } from "lucide-react";

// Pantalla de acceso denegado por RBAC (F0_018). Distinta de LoginRequired:
// acá sí hay sesión, lo que falta es el permiso en el rol.
export function SinPermiso({ permiso, detalle }: { permiso: string; detalle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-secondary p-4">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Acceso restringido</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {detalle || "Tu rol no tiene acceso a esta sección."} Pedile a un administrador que active el
        permiso <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">{permiso}</code> en
        Administración → Roles.
      </p>
    </div>
  );
}
