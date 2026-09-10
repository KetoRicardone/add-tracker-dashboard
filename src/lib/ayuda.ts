// Contenido de la ayuda en pantalla (el botón «?» de cada sección).
//
// Vive acá y no dentro de los componentes por dos motivos: el texto se revisa
// como documentación —sin leer JSX— y una misma explicación se muestra desde
// más de un lugar.
//
// Cada tema declara:
//   titulo, icono, resumen  — encabezado del popup.
//   secciones[]             — bloques tipados que <Ayuda> sabe pintar:
//       parrafos  · texto corrido
//       lista     · viñetas (condiciones, reglas)
//       pasos     · numerado (el uso correcto)
//       campos    · [{ nombre, detalle, req, valores }] los datos que se ven
//       faq       · [{ p, r }] problemas frecuentes
//
// Regla al editar: si cambia una condición del código (un límite, un default,
// un disparo), se cambia acá también. Una ayuda desactualizada miente peor que
// no tener ayuda.

export interface CampoAyuda {
  nombre: string;
  detalle?: string;
  req?: boolean;
  valores?: string;
}

export type SeccionAyuda =
  | { titulo?: string; tipo: "parrafos"; items: string[] }
  | { titulo?: string; tipo: "lista"; items: string[] }
  | { titulo?: string; tipo: "pasos"; items: string[] }
  | { titulo?: string; tipo: "campos"; items: CampoAyuda[] }
  | { titulo?: string; tipo: "faq"; items: { p: string; r: string }[] };

export interface TemaAyuda {
  titulo: string;
  icono: string;
  resumen: string;
  secciones: SeccionAyuda[];
  /** Sección del manual completo a la que enlaza el pie del popup. */
  ancla?: string;
}

// Nota común a todas las pantallas: se repite en el pie del popup en vez de en
// cada tema.
export const NOTA_GENERAL =
  "El panel es de consulta y auditoría: la carga se hace desde el bot de Telegram, en planta. " +
  "Qué secciones ves depende de los permisos de ámbito Panel de tu rol.";

export const MANUAL_URL = "/manuales/manual-panel.html";

export const AYUDA: Record<string, TemaAyuda> = {
  // ───────────────────────────────────────────────── Torre de control ──
  torre: {
    titulo: "Torre de control",
    icono: "🗼",
    ancla: "torre",
    resumen:
      "La primera pantalla: cómo viene todo hoy. Números, en qué estado está cada lote, " +
      "qué hay que mirar y qué se cargó recién.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Resume la operación completa en una sola vista. No reemplaza a ninguna de las otras: " +
            "es el lugar desde donde se detecta que algo necesita atención y se entra a mirarlo.",
          "Todo lo que muestra sale de eventos ya registrados por el bot. El panel no calcula " +
            "nada que después guarde: los números se derivan al momento de mirarlos.",
        ],
      },
      {
        titulo: "Los indicadores",
        tipo: "campos",
        items: [
          {
            nombre: "Trazabilidades abiertas",
            detalle: "Lotes de materia prima sin cerrar. Cada uno nace de una Carta de Porte.",
          },
          {
            nombre: "Lotes de producción",
            detalle:
              "Estibas con al menos un evento. Es el producto terminado, no la materia prima: " +
              "los dos números no tienen por qué coincidir.",
          },
          {
            nombre: "Eventos hoy",
            detalle: "Registros cargados desde las 00:00. Debajo, el acumulado de 7 días.",
          },
          {
            nombre: "Kg despachados",
            detalle: "Suma de los remitos registrados en RGAN-56.",
          },
          {
            nombre: "Liberaciones",
            detalle:
              "Cuántas se hicieron (RGAN-104). Se pone en rojo si alguna quedó marcada NO APTO.",
          },
        ],
      },
      {
        titulo: "Pipeline de materia prima",
        tipo: "parrafos",
        items: [
          "Cada casilla es un estado del circuito y el número es cuántos lotes están ahí. " +
            "Los estados salen de la tabla de la base, no de una lista escrita en el panel: " +
            "si mañana se agrega uno, aparece solo.",
          "Los estados en rojo son excepciones: RETENIDA, BLOQUEADO, RECHAZADO y EN_ANTECÁMARA. " +
            "Un lote ahí tiene la cadena cortada hasta que alguien lo resuelva.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Las alertas no son un semáforo inventado: cada una corresponde a una regla real del " +
            "circuito (lote en estado de excepción, PCC con falla, liberación NO APTO, evento " +
            "crítico sin firma).",
          "«Últimos movimientos» mezcla eventos de lote y de planta ordenados por fecha. Los de " +
            "planta llevan el sello PLANTA y no pertenecen a ninguna trazabilidad.",
          "La pantalla se refresca sola cada 30 segundos.",
        ],
      },
      {
        titulo: "Problemas frecuentes",
        tipo: "faq",
        items: [
          {
            p: "Todo está en cero.",
            r: "O la base se reseteó para una prueba, o todavía no se cargó nada desde el bot. " +
              "Los números aparecen apenas se registra la primera Carta de Porte.",
          },
          {
            p: "Los kg despachados no cuadran con lo producido.",
            r: "Es esperable si hubo despachos parciales: un lote puede salir en varios remitos. " +
              "El detalle por lote está en Despachos.",
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────── Trazabilidades ──
  trazabilidades: {
    titulo: "Trazabilidades",
    icono: "🌾",
    ancla: "trazabilidades",
    resumen:
      "Los lotes de materia prima, tal como entraron. Cada trazabilidad nace de una Carta de " +
      "Porte y agrupa todo lo que le pasó a ese grano.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Lista las trazabilidades abiertas con su avance por fase, y permite entrar a la ficha " +
            "de cada una para ver el detalle evento por evento.",
          "El identificador se arma solo al cargar la Carta de Porte: prefijo de origen, código de " +
            "establecimiento, código de grano y campaña. Por ejemplo «1SM1-SES-2425».",
        ],
      },
      {
        titulo: "Qué se ve de cada una",
        tipo: "campos",
        items: [
          { nombre: "Identificador", detalle: "Origen, establecimiento, grano y campaña, en un solo código." },
          { nombre: "Estado operacional", detalle: "En qué punto del circuito está el lote. Los de excepción se marcan en rojo." },
          { nombre: "Avance por fases", detalle: "Cuántos pasos del circuito se completaron sobre el total previsto." },
          { nombre: "Cartas de porte", detalle: "Una trazabilidad puede agrupar más de una CP del mismo grano, establecimiento y campaña." },
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Una trazabilidad es materia prima, no producto terminado. El producto terminado es el " +
            "lote de producción, que tiene su propia sección.",
          "Si dos camiones traen el mismo grano del mismo establecimiento y campaña, el bot los " +
            "suma a la misma trazabilidad en vez de crear una nueva.",
          "Se listan sólo las abiertas. Las cerradas o anuladas no aparecen acá.",
        ],
      },
    ],
  },

  // ───────────────────────────────────── Ficha de una trazabilidad ──
  trazabilidad: {
    titulo: "Ficha de la trazabilidad",
    icono: "📋",
    ancla: "trazabilidad",
    resumen:
      "Todo lo que le pasó a un lote de materia prima, en orden y agrupado por fase del circuito.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Muestra la historia completa: cada evento con quién lo cargó, cuándo, con qué resultado " +
            "y con qué datos. Los eventos se agrupan por Carta de Porte cuando corresponde.",
          "Es también donde se corrige: un evento mal cargado se anula o se corrige desde acá, " +
            "si tu rol tiene el permiso.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Un evento confirmado no se edita ni se borra. Anular deja el evento marcado y registra " +
            "quién y por qué; corregir crea un evento nuevo que reemplaza al anterior sin " +
            "borrarlo. La historia queda entera.",
          "Anular un evento devuelve el lote al estado anterior: si se anula el que hizo avanzar " +
            "la cadena, el lote vuelve atrás.",
          "La humedad fuera de norma se marca contra el límite del grano: amarillo entre el " +
            "máximo y dos puntos más, rojo por encima. El límite es el que regía cuando se " +
            "registró el evento, no el de hoy.",
          "Si el grano no tiene límite de humedad cargado, se dice «sin límite cargado» en vez de " +
            "inventar uno.",
        ],
      },
      {
        titulo: "Problemas frecuentes",
        tipo: "faq",
        items: [
          {
            p: "Un evento aparece sin firmante.",
            r: "Los eventos anteriores a que se implementara la firma vinculada no la tienen. " +
              "Los nuevos sí: cada firma queda atada a su evento, no inferida por cercanía de fecha.",
          },
          {
            p: "No veo los botones de anular o corregir.",
            r: "Necesitan el permiso de panel para anular. Se asigna en Administración → Roles.",
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────── Lotes de producción ──
  lotes: {
    titulo: "Lotes de producción",
    icono: "📦",
    ancla: "lotes",
    resumen:
      "El producto terminado. Cada lote es una estiba, identificada por el rótulo que genera el " +
      "control de proceso y que arrastran todos los pasos siguientes.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Lista las estibas con su estado, kilos producidos, unidades y de cuántos lotes de " +
            "materia prima se alimentaron.",
          "El rótulo se arma solo: país, código del grano en inglés, planta con su correlativo, y " +
            "año de cosecha. En «AR-WSS-LE01-26» el «LE» no es literal: es planta L (Las Lajitas) " +
            "más E más el número 01.",
        ],
      },
      {
        titulo: "De dónde sale este listado",
        tipo: "parrafos",
        items: [
          "El lote de producción todavía no es una tabla propia: vive como texto dentro de los " +
            "eventos y como columna en los registros de liberación y despacho. El panel lo " +
            "reconstruye cada vez que abrís la pantalla.",
          "Hay un detalle que conviene saber: el rótulo se graba con dos nombres distintos según " +
            "qué formulario lo escriba. El control de proceso —que es el que abre la estiba— usa " +
            "uno, y producción, peso de bolsas y PCC usan otro. El panel mira los dos; si mirara " +
            "uno solo, el lote parecería empezar recién en el embolsado.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "La relación entre lote de producción y materia prima es de muchos a muchos: una estiba " +
            "se llena a lo largo de varios días con grano de más de una Carta de Porte, y una " +
            "Carta de Porte puede alimentar varias estibas.",
          "Por eso el estado del lote de producción no es el mismo que el estado operacional de la " +
            "trazabilidad: se deriva de los hitos que el propio lote alcanzó.",
          "Un lote sin eventos no existe para el panel. El primero nace cuando el control de " +
            "proceso abre la estiba.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────── Ficha de un lote ──
  lote: {
    titulo: "Ficha del lote",
    icono: "🏷",
    ancla: "lote",
    resumen:
      "La historia completa de una estiba: de qué campos vino, qué se le hizo, si está liberada, " +
      "por dónde salió y qué documentación tiene.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Reúne en un solo lugar todo lo que hoy está repartido entre eventos y registros: el " +
            "origen, la producción, el control de peso, el PCC, la liberación y los despachos.",
          "Es la pantalla a la que apunta el código QR del lote.",
        ],
      },
      {
        titulo: "Los bloques",
        tipo: "campos",
        items: [
          {
            nombre: "Origen de la materia prima",
            detalle:
              "De qué trazabilidades se alimentó esta estiba. Si hay más de una, se listan todas: " +
              "el origen se abre en abanico, no es una línea recta.",
          },
          {
            nombre: "Liberación de producto",
            detalle:
              "Si el lote fue liberado para consumo humano o quedó bloqueado, con el laboratorio y " +
              "el número de informe. Si salió junto a otros lotes, se listan y se puede saltar a ellos.",
          },
          {
            nombre: "Despachos",
            detalle:
              "Los remitos por los que salió, con las unidades y los kilos de ESTE lote en cada uno. " +
              "Un lote puede salir en varios remitos.",
          },
          {
            nombre: "Historia del lote",
            detalle:
              "Todos los eventos que nombran a este lote, en orden. Si el origen es múltiple, cada " +
              "evento indica de qué trazabilidad vino.",
          },
          {
            nombre: "Documentos y análisis",
            detalle:
              "Los análisis declarados en la liberación y la evidencia enviada por Telegram. Ver la " +
              "advertencia de abajo.",
          },
          {
            nombre: "Código QR",
            detalle: "Apunta a esta misma ficha. Se puede descargar como imagen.",
          },
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Los análisis de laboratorio se ven como declarados en el formulario de liberación " +
            "—laboratorio, número de informe, tipo— pero el PDF no está adjunto: todavía no hay " +
            "almacenamiento de archivos conectado. La ficha lo dice explícitamente en vez de " +
            "dejar un espacio vacío.",
          "Las fotos que se mandan por Telegram quedan como una referencia al archivo en los " +
            "servidores de Telegram. No tienen huella digital ni se pueden abrir desde el panel.",
          "El QR todavía no es para imprimir en etiquetas: la dirección a la que apunta depende de " +
            "un dominio que no está decidido, y una dirección impresa es para siempre. Por ahora, " +
            "usalo en pantalla.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────── Eventos ──
  eventos: {
    titulo: "Eventos",
    icono: "⚡",
    ancla: "eventos",
    resumen:
      "El historial crudo: todo lo que se registró, de todos los lotes y de la planta, ordenado " +
      "por fecha.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Es la vista cronológica sin agrupar. Sirve para responder «qué pasó esta mañana» o " +
            "«quién cargó esto», sin tener que entrar lote por lote.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Los eventos de planta —limpieza y mantenimiento— aparecen con el sello PLANTA y sin " +
            "enlace a ninguna ficha de lote: no pertenecen a ninguno.",
          "Los eventos anulados y los que fueron reemplazados por una corrección no se listan.",
          "Cada fila muestra los datos con etiquetas en castellano, no con los nombres internos " +
            "de los campos.",
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────── Planta ──
  planta: {
    titulo: "Planta",
    icono: "🏭",
    ancla: "planta",
    resumen:
      "Limpieza por cambio de grano y mantenimiento diario: las dos operaciones de la línea que " +
      "no pertenecen a ningún lote.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Muestra los dos formularios de planta separados del resto, porque son de otra " +
            "naturaleza: la limpieza ocurre ENTRE dos lotes —cuando se registra, el lote " +
            "siguiente todavía no existe— y el mantenimiento cubre la línea entera por turno.",
        ],
      },
      {
        titulo: "Limpieza de planta",
        tipo: "lista",
        items: [
          "Se registra al cambiar de grano. Pide el material anterior, el siguiente, los kilos de " +
            "purga y —sólo si se viene de sésamo— el hisopado por sector y el alcohol.",
          "La purga mínima es de 4 toneladas por cambio de grano, y 5 si el grano anterior fue " +
            "sésamo. Los números están cargados en la base: si el cliente los cambia, no hay que " +
            "tocar el bot.",
          "Si la purga no llega al mínimo, el registro se guarda igual —es evidencia— pero queda " +
            "marcado como no conforme, y en ese estado NO habilita el cambio de grano.",
          "Una limpieza conforme es la que destraba el ingreso a proceso de un grano distinto.",
        ],
      },
      {
        titulo: "Mantenimiento diario",
        tipo: "lista",
        items: [
          "Un registro por turno, con los 24 puntos de la planilla. Los ítems salen de la base en " +
            "el orden impreso del formulario.",
          "Incluye una rareza del formulario original que no es un error: los elevadores son 1, 2, " +
            "4, 5 y 6. No hay «Elevador 3».",
          "El punto de control de herramientas se responde Sí o No, no conforme o problema: la " +
            "planilla pide «Caja Completa SI/NO».",
        ],
      },
      {
        titulo: "Sobre la segunda firma",
        tipo: "parrafos",
        items: [
          "Las dos planillas tienen dos renglones de firma en el papel: quien ejecutó y quien " +
            "verificó. El bot registra sólo la primera, a propósito.",
          "El motivo: la firma se resuelve por el chat de Telegram desde el que se carga, así que " +
            "pedir el PIN dos veces desde el mismo teléfono daría la misma persona firmando dos " +
            "veces. Sería peor que una sola firma, porque simularía un control cruzado que no " +
            "existió. La verificación tiene que llegar desde el chat del verificador, y esa " +
            "acción todavía no está construida.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────── Liberaciones ──
  liberaciones: {
    titulo: "Liberaciones",
    icono: "🛡",
    ancla: "liberaciones",
    resumen:
      "El control que decide si la mercadería sale a consumo humano. Es el punto de no retorno " +
      "de la cadena.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Lista las liberaciones con el resultado bien visible: apto o bloqueado. Cada una puede " +
            "cubrir varios lotes bajo un mismo informe de laboratorio, como en el formulario de " +
            "papel, que tiene cinco renglones de lote.",
        ],
      },
      {
        titulo: "Qué se ve de cada una",
        tipo: "campos",
        items: [
          {
            nombre: "Condición para consumo humano",
            detalle: "Lo único que decide si el lote puede despacharse. Si está en NO APTO, el lote queda bloqueado.",
          },
          { nombre: "Laboratorio e informe", detalle: "Quién hizo el análisis y con qué número de informe." },
          { nombre: "Tipo de análisis", detalle: "Microbiológicos, pesticidas, y lo que se haya tildado." },
          { nombre: "Lotes cubiertos", detalle: "Todos los que salieron bajo esta liberación. Se puede entrar a la ficha de cada uno." },
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Los análisis quedan registrados como declarados: el número de informe y el laboratorio " +
            "sí están, el PDF todavía no se puede adjuntar.",
          "Una liberación no se edita. Si hubo un error, se corrige por el mecanismo de auditoría, " +
            "que deja constancia.",
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────── Despachos ──
  despachos: {
    titulo: "Despachos",
    icono: "🚚",
    ancla: "despachos",
    resumen:
      "Qué salió de planta, cuánto y para quién. Cierra la cadena operativa.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Lista los remitos registrados con el detalle por lote. Ese detalle es la parte " +
            "importante: guarda las unidades y los kilos de cada lote dentro de cada remito, que " +
            "es exactamente lo que permite cuantificar un retiro si alguna vez hiciera falta.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Un lote puede salir en varios remitos: el despacho parcial está contemplado.",
          "Si un número de remito se repite, el panel lo marca. El bot avisa al cargarlo pero no " +
            "lo impide, porque a veces el mismo remito cubre dos salidas.",
          "Las patentes se normalizan a mayúscula al registrarlas, se hayan tipeado como se hayan " +
            "tipeado.",
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────── Auditoría ──
  auditoria: {
    titulo: "Auditoría",
    icono: "🛡",
    ancla: "auditoria",
    resumen:
      "Qué se anuló, qué se corrigió, quién lo hizo y por qué. La contracara de que nada se borre.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Muestra las anulaciones y correcciones de eventos y de cartas de porte, con el actor y " +
            "el motivo de cada una.",
          "El sistema no borra ni edita registros confirmados. Anular deja el evento marcado como " +
            "anulado y agrega una fila con quién y por qué; corregir crea un evento nuevo que " +
            "apunta al que reemplaza. Nada desaparece del historial.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Anular un evento puede devolver el lote a su estado anterior. Es lo esperado: si se " +
            "anula el paso que lo hizo avanzar, el lote vuelve.",
          "El motivo es obligatorio. Sin él no se puede anular.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────── Administración ──
  adminUsuarios: {
    titulo: "Usuarios",
    icono: "👥",
    ancla: "admin-usuarios",
    resumen: "Quién puede usar el bot y el panel, con qué rol, y el manejo de sus PIN.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Da de alta usuarios, les asigna rol y permite reiniciar su PIN. El rol es lo que " +
            "determina qué puede hacer cada uno, tanto en el bot como en el panel.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "El identificador de Telegram es lo que ata a la persona con su chat. Sin él, el bot no " +
            "la reconoce y no puede firmar.",
          "El PIN es personal e intransferible: es lo que da validez a la firma de cada documento. " +
            "El mensaje con el PIN se borra del chat apenas se lee.",
          "Reiniciar un PIN obliga a la persona a crear uno nuevo la próxima vez que firme.",
          "Los permisos no se asignan por persona sino por rol. Si dos personas comparten rol, " +
            "tienen el mismo acceso.",
        ],
      },
    ],
  },

  adminRoles: {
    titulo: "Roles y permisos",
    icono: "🔐",
    ancla: "admin-roles",
    resumen:
      "Qué puede hacer cada rol, separado en dos mitades: los formularios del bot y las secciones " +
      "del panel.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Es una matriz de roles por permisos. Tildar concede, destildar quita, y el cambio se " +
            "aplica enseguida: en el bot, en tiempo real; en el panel, al recargar la página.",
          "Los permisos del bot están agrupados por fase del circuito, y cada fila dice qué botón " +
            "del menú abre. Los botones «todos» y «ninguno» aplican el cambio a todos los roles " +
            "de una vez.",
        ],
      },
      {
        titulo: "Las dos mitades",
        tipo: "campos",
        items: [
          {
            nombre: "Bot de Telegram",
            detalle:
              "Un permiso por formulario. Filtran qué botones ve cada rol al abrir el menú, y " +
              "además rebotan la acción si alguien toca un botón de un mensaje viejo.",
          },
          {
            nombre: "Panel web",
            detalle:
              "Qué secciones del panel puede abrir cada rol. No pasan por el menú del bot: los " +
              "aplica el propio panel al abrir cada página.",
          },
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Hay un candado: al rol Administrador no se le pueden quitar los permisos de entrar a " +
            "Administración y de gestionar roles. Sin ellos nadie podría volver a esta pantalla " +
            "para restaurar nada.",
          "El grupo «Históricos» son permisos que ya no gobiernan ningún formulario. Quedaron " +
            "cuando se pasó de un permiso general por fase a uno por formulario. No se borraron " +
            "porque son el registro de quién tenía qué; tildarlos no habilita nada.",
          "Cuando una fila del bot avisa que no gobierna ningún botón, quiere decir eso " +
            "literalmente: nadie gana acceso al tildarla.",
        ],
      },
      {
        titulo: "Uso correcto",
        tipo: "pasos",
        items: [
          "Antes de sacarle un permiso a un rol, mirá qué botón dice que abre: la fila lo indica.",
          "Al validar un formulario nuevo, prendéselo primero a un rol de prueba y recién después " +
            "al resto.",
          "Si alguien reporta que «desapareció un botón», revisá acá antes de buscar un problema " +
            "en el bot.",
        ],
      },
    ],
  },

  adminPrecintos: {
    titulo: "Precintos",
    icono: "🔖",
    ancla: "admin-precintos",
    resumen:
      "Las precargas de precintos que se sacan por foto antes de que exista la Carta de Porte.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Permite revisar las precargas, corregir un peso mal leído y vincularlas a la Carta de " +
            "Porte cuando aparece.",
          "Existe porque en la práctica el operario ve el precinto antes que el papel: se saca la " +
            "foto en el momento y se vincula después.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Una precarga sin vincular no pertenece a ninguna trazabilidad todavía.",
          "Un peso corregido a mano queda marcado como corregido: no se pierde el dato de que la " +
            "lectura original era otra.",
        ],
      },
    ],
  },

  adminEstablecimientos: {
    titulo: "Establecimientos",
    icono: "🏢",
    ancla: "admin-establecimientos",
    resumen:
      "El maestro de campos de origen. Es lo que el lector de la Carta de Porte usa para " +
      "normalizar de dónde viene el grano.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Administra el catálogo con su código, que es el que termina formando parte del " +
            "identificador de cada trazabilidad.",
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "El código forma parte del identificador de la trazabilidad. Cambiarlo no reescribe las " +
            "trazabilidades ya creadas.",
          "El lector de la Carta de Porte busca por nombre y por variantes conocidas. Si un " +
            "establecimiento se escribe de varias formas en los papeles, conviene que esté " +
            "contemplado acá.",
        ],
      },
    ],
  },

  adminGranos: {
    titulo: "Granos",
    icono: "🌱",
    ancla: "admin-granos",
    resumen:
      "El maestro de granos: sus códigos, el límite de humedad y los campos de calidad que el " +
      "bot pregunta para cada uno.",
    secciones: [
      {
        titulo: "Qué hace esta pantalla",
        tipo: "parrafos",
        items: [
          "Administra los granos que comercializa la empresa y, para cada uno, qué defectos se " +
            "miden en el control de calidad de ingreso. El bot pregunta lo que diga esta tabla: " +
            "agregar un campo es un alta acá, no un cambio en el bot.",
        ],
      },
      {
        titulo: "Los campos importantes",
        tipo: "campos",
        items: [
          {
            nombre: "Humedad máxima",
            detalle:
              "El límite del grano. Por encima del máximo más dos puntos, el lote se rechaza. Si " +
              "está vacío, el sistema dice «sin límite cargado» en vez de suponer uno.",
          },
          {
            nombre: "Rótulo de estiba",
            detalle:
              "El código del grano en inglés, que forma parte del rótulo del lote de producción. " +
              "No se deduce del código interno, por eso se carga a mano.",
          },
          {
            nombre: "Campos de calidad",
            detalle:
              "Los defectos que se miden para ese grano. Algunos no suman a la caída total: eso " +
              "también se define acá.",
          },
        ],
      },
      {
        titulo: "Condiciones y reglas",
        tipo: "lista",
        items: [
          "Cambiar un límite de humedad no reescribe los eventos ya registrados: cada uno guarda " +
            "el límite que regía en su momento.",
          "Un grano sin rótulo de estiba obliga a tipear el rótulo a mano en el bot. Es " +
            "deliberado: un rótulo inventado viajaría hasta la liberación y el despacho.",
        ],
      },
    ],
  },
};
