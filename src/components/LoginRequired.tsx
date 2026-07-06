import { Lock } from "lucide-react";

/**
 * Aviso de acceso restringido para páginas que requieren sesión iniciada.
 * El login se hace desde el control del menú lateral (LoginControl).
 */
export function LoginRequired({
  titulo = "Iniciá sesión",
  detalle = "Necesitás iniciar sesión para ver esta sección. Usá el botón «Iniciar sesión» del menú (arriba a la izquierda en escritorio, o en el menú ☰ en celular).",
}: {
  titulo?: string;
  detalle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-secondary p-4">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{detalle}</p>
    </div>
  );
}
