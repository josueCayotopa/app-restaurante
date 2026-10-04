import { apiFetch } from './api'
import { socket } from './socket'
import { useToastStore } from '../store/toastStore'

// ── Modelo de ticket (el mismo que arma el servidor en server/src/lib/impresion) ──

type Tamano = 1 | 'alto' | 2
type Linea =
  | { t: 'logo' }
  | { t: 'texto'; texto: string; alinear?: 'izq' | 'centro' | 'der'; negrita?: boolean; tam?: Tamano; invertido?: boolean }
  | { t: 'fila'; izq: string; der: string; negrita?: boolean; tam?: Tamano }
  | { t: 'separador'; doble?: boolean }
  | { t: 'espacio' }
export interface Documento { titulo: string; lineas: Linea[] }

export const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin', mixto: 'Mixto', dividida: 'Cuenta dividida',
}

// ── Impresoras asignadas a ESTE equipo (impresoras USB "de equipo") ─────────────

const CLAVE_EQUIPO = 'sgr_impresoras_equipo'
export function impresorasDeEsteEquipo(): string[] {
  try { return JSON.parse(localStorage.getItem(CLAVE_EQUIPO) ?? '[]') } catch { return [] }
}
export function guardarImpresorasDeEsteEquipo(ids: string[]) {
  try { localStorage.setItem(CLAVE_EQUIPO, JSON.stringify(ids)) } catch { /* sin almacenamiento */ }
}

// Ancho para impresión local cuando no hay impresora configurada (la del propio equipo)
const CLAVE_ANCHO = 'sgr_ancho_local'
export function anchoLocal(): 58 | 80 {
  try { return localStorage.getItem(CLAVE_ANCHO) === '58' ? 58 : 80 } catch { return 80 }
}
export function guardarAnchoLocal(ancho: 58 | 80) {
  try { localStorage.setItem(CLAVE_ANCHO, String(ancho)) } catch { /* sin almacenamiento */ }
}

// ── Documento → HTML ────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tamCss = (tam?: Tamano) => (tam === 2 ? 'font-size:2em;' : tam === 'alto' ? 'font-size:1.35em;' : '')

export function documentoAHtml(doc: Documento, ancho: number): string {
  const anchoMm = `${ancho}mm`
  const cuerpo = doc.lineas.map((l) => {
    switch (l.t) {
      case 'logo': return `<img class="logo" src="${location.origin}/logo.jpeg" onerror="this.remove()" />`
      case 'espacio': return '<div style="height:1em"></div>'
      case 'separador': return `<div class="sep${l.doble ? ' doble' : ''}"></div>`
      case 'texto': return `<div style="text-align:${l.alinear === 'centro' ? 'center' : l.alinear === 'der' ? 'right' : 'left'};${l.negrita ? 'font-weight:900;' : ''}${tamCss(l.tam)}${l.invertido ? 'background:#000;color:#fff;-webkit-text-stroke:0;padding:1px 0;' : ''}">${esc(l.texto)}</div>`
      case 'fila': return `<div class="fila" style="${l.negrita ? 'font-weight:900;' : ''}${tamCss(l.tam)}"><span>${esc(l.izq)}</span><span>${esc(l.der)}</span></div>`
    }
  }).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(doc.titulo)}</title><style>
    @page { size: ${anchoMm} auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { width: ${anchoMm}; padding: 6px 8px 18px; font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: ${ancho <= 58 ? '11px' : '13px'}; color: #000; -webkit-text-stroke: 0.25px #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .logo { display: block; margin: 0 auto 4px; max-width: 60%; max-height: 56px; object-fit: contain; }
    .sep { border-top: 2px dashed #000; margin: 6px 0; }
    .sep.doble { border-top: 3px double #000; }
    .fila { display: flex; justify-content: space-between; gap: 8px; margin: 1px 0; }
    .fila span:last-child { white-space: nowrap; }
  </style></head><body>${cuerpo}</body></html>`
}

// Imprime con el navegador usando un iframe oculto (no lo bloquea el bloqueador de ventanas
// emergentes, así que funciona aunque llegue por socket sin que nadie toque la pantalla).
// En las PCs de Caja/Cocina, abrir Chrome con --kiosk-printing imprime sin mostrar diálogo.
export function imprimirEnNavegador(doc: Documento, ancho: number = anchoLocal(), copias = 1): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(iframe)
    const d = iframe.contentDocument!
    d.open()
    d.write(Array.from({ length: Math.max(1, copias) }, () => documentoAHtml(doc, ancho)).join('<div style="page-break-after:always"></div>'))
    d.close()
    const lanzar = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        // Se retira después: algunos navegadores siguen leyendo el iframe durante la impresión
        setTimeout(() => { iframe.remove(); resolve() }, 60000)
      }, 150)
    }
    // Espera a que cargue el logo (si lo hay) para que salga en el papel
    const img = d.querySelector('img')
    if (img && !img.complete) { img.onload = lanzar; img.onerror = lanzar } else lanzar()
  })
}

// ── Pedidos de impresión al servidor ────────────────────────────────────────────
// El servidor manda el ticket a las impresoras configuradas del área. Si el área no tiene
// impresoras, devuelve el documento y se imprime aquí mismo con el navegador.

type Respuesta = { destino: 'impresora' } | { destino: 'local'; documento: Documento }

async function pedir(ruta: string, body: Record<string, unknown> = {}) {
  const r = await apiFetch<Respuesta>(ruta, { method: 'POST', body: JSON.stringify(body) })
  if (r.destino === 'local') await imprimirEnNavegador(r.documento)
  return r.destino
}

export const imprimirCobro = (comandaId: string, opciones: { abrirGaveta?: boolean } = {}) =>
  pedir(`/api/impresion/cobro/${comandaId}`, { abrirGaveta: opciones.abrirGaveta ?? true })
export const imprimirCierre = (sesionId: string) => pedir(`/api/impresion/cierre/${sesionId}`)
export const reimprimirComanda = (comandaId: string, area: 'cocina' | 'bar', itemIds?: string[]) =>
  pedir(`/api/impresion/comanda/${comandaId}`, { area, itemIds })

// ── Trabajos para impresoras "de equipo" (USB conectada a esta PC/tablet) ───────
// Todos los equipos reciben el aviso; solo imprime el que tiene esa impresora asignada
// y le confirma al servidor que lo hizo (así el historial sabe si salió).
socket.on('impresion:equipo', (
  data: { impresoraId: string; documento: Documento; ancho: number; copias: number },
  responder?: (ok: boolean) => void,
) => {
  const mia = impresorasDeEsteEquipo().includes(data.impresoraId)
  console.info(`[impresion] Trabajo recibido: "${data.documento.titulo}" · ${mia ? 'esta PC lo imprime' : 'no es para esta PC'}`)
  if (!mia) { responder?.(false); return }
  // Aviso visible: confirma que el ticket llegó a esta PC (si no sale papel, el problema es el navegador/driver)
  useToastStore.getState().agregar({ tipo: 'info', titulo: '🖨 Imprimiendo', mensaje: data.documento.titulo, duracion: 4000 })
  imprimirEnNavegador(data.documento, data.ancho, data.copias).catch((e) => console.error('[impresion] Error al imprimir:', e))
  responder?.(true)
})
