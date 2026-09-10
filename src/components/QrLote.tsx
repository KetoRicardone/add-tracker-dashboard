import QRCode from "qrcode";

/**
 * QR de la ficha del lote, generado en el servidor: no sale una request a
 * ningún servicio externo y el código no depende de que un tercero siga vivo
 * dentro de cinco años.
 *
 * ── Antes de imprimir esto en una etiqueta ───────────────────────────────────
 * La URL impresa es para siempre. Hoy apunta a `/lotes/<rótulo de estiba>`, que
 * es legible y ya existe, pero hay dos cosas sin cerrar (ver ROADMAP, "Ficha
 * digital del lote + QR"):
 *   · el dominio definitivo del panel;
 *   · que el identificador de la URL no debería ser secuencial, y el rótulo
 *     (`AR-WSS-LE01-26`) lo es en parte — el `01` es un correlativo.
 * Mientras eso no se decida, esto sirve para pantalla y para pruebas. Cuando
 * exista `lotes_produccion` con un id opaco, la ruta actual queda como alias y
 * los QR ya impresos siguen funcionando.
 */
export async function QrLote({ url, tamano = 160 }: { url: string; tamano?: number }) {
  let dataUrl = "";
  try {
    dataUrl = await QRCode.toDataURL(url, {
      width: tamano * 2, // 2x para que no se vea borroso en pantallas densas
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return (
      <p className="text-xs text-muted-foreground">No se pudo generar el QR de este lote.</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR de ${url}`} width={tamano} height={tamano} />
      </div>
      <a
        href={dataUrl}
        download={`qr-${url.split("/").pop()}.png`}
        className="text-[11px] font-medium text-primary hover:underline"
      >
        Descargar PNG
      </a>
      <p className="max-w-[200px] break-all text-center text-[10px] leading-tight text-muted-foreground">
        {url}
      </p>
    </div>
  );
}
