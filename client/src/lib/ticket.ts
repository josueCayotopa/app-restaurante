import type { Comanda, ItemComanda, MetodoPago } from '../types'
import { useConfiguracionStore } from '../store/configuracionStore'

const LOGO_URL = `${window.location.origin}/logo.jpeg`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function anchoDeArea(area: 'cocina' | 'bar' | 'caja'): '58mm' | '80mm' {
  const impresoras = useConfiguracionStore.getState().impresoras
  const activa = impresoras.find((i) => i.area === area && i.activa)
  return activa?.ancho ?? '80mm'
}

function estilosBase(ancho: '58mm' | '80mm'): string {
  return `
    @page { size: ${ancho} auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${ancho};
      margin: 0 auto;
      padding: 8px 10px 20px;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${ancho === '58mm' ? '10.5px' : '12.5px'};
      color: #000;
      -webkit-print-color-adjust: exact;
    }
    .centro { text-align: center; }
    .logo { display: block; margin: 0 auto 4px; max-width: 65%; max-height: 56px; object-fit: contain; }
    .titulo { font-weight: bold; font-size: 1.35em; letter-spacing: 0.5px; }
    .sub { font-size: 0.85em; opacity: 0.85; margin-top: 1px; }
    .linea { border-top: 1px dashed #000; margin: 7px 0; }
    .fila { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .item { margin-bottom: 5px; }
    .item-nombre { display: flex; justify-content: space-between; font-weight: bold; gap: 8px; }
    .item-detalle { font-size: 0.85em; padding-left: 10px; opacity: 0.9; }
    .total { font-weight: bold; font-size: 1.2em; }
    .footer { margin-top: 10px; font-size: 0.85em; line-height: 1.5; }
    .badge { display: inline-block; border: 1px solid #000; border-radius: 3px; padding: 0 4px; font-size: 0.8em; margin-right: 3px; }
    .mesa-grande { font-size: 2em; font-weight: bold; letter-spacing: 1px; }
  `
}

function abrirEImprimir(html: string): void {
  const ventana = window.open('', '_blank', 'width=420,height=640')
  if (!ventana) return
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.onload = () => {
    ventana.focus()
    ventana.print()
  }
}

function encabezadoLogo(titulo: string, subtitulo?: string): string {
  return `
    <div class="centro">
      <img class="logo" src="${LOGO_URL}" onerror="this.style.display='none'" />
      <div class="titulo">${escapeHtml(titulo)}</div>
      ${subtitulo ? `<div class="sub">${escapeHtml(subtitulo)}</div>` : ''}
    </div>
  `
}

function mesaLabel(comanda: Comanda): string {
  return `${comanda.numeroMesa}${comanda.mesasUnidas?.length ? ' +' + comanda.mesasUnidas.join('+') : ''}`
}

// ── Ticket de caja (boleta de cobro) ────────────────────────────────────────

export interface DatosPago {
  metodo: MetodoPago
  subtotal: number
  descuentoPct: number
  propina: number
  total: number
  vuelto: number
}

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape_plin: 'Yape / Plin',
  mixto: 'Mixto',
}

export function imprimirTicketCaja(comanda: Comanda, pago: DatosPago): void {
  const ancho = anchoDeArea('caja')
  const fecha = new Date()
  const descuentoMonto = pago.subtotal * (pago.descuentoPct / 100)

  const itemsHtml = comanda.items
    .filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
    .map((i) => `
      <div class="item">
        <div class="item-nombre"><span>${i.cantidad}x ${escapeHtml(i.nombre)}</span><span>S/ ${(i.cantidad * i.precioUnitario).toFixed(2)}</span></div>
        ${i.tipoPlato || i.guarniciones?.length ? `<div class="item-detalle">${i.tipoPlato ? (i.tipoPlato === 'plato' ? 'Plato' : 'Fuente') : ''}${i.tipoPlato && i.guarniciones?.length ? ' · ' : ''}${i.guarniciones?.length ? i.guarniciones.join(', ') : ''}</div>` : ''}
      </div>
    `).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket — Mesa ${mesaLabel(comanda)}</title><style>${estilosBase(ancho)}</style></head>
<body>
  ${encabezadoLogo('CHICHARRONERÍA CADE', 'Un restaurant para la familia Ebenezer')}
  <div class="linea"></div>
  <div class="fila"><span>Mesa</span><span>${mesaLabel(comanda)}</span></div>
  <div class="fila"><span>Mozo</span><span>${escapeHtml(comanda.mozo)}</span></div>
  <div class="fila"><span>Fecha</span><span>${fecha.toLocaleDateString('es-PE')} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="linea"></div>
  ${itemsHtml}
  <div class="linea"></div>
  <div class="fila"><span>Subtotal</span><span>S/ ${pago.subtotal.toFixed(2)}</span></div>
  ${pago.descuentoPct > 0 ? `<div class="fila"><span>Descuento (${pago.descuentoPct}%)</span><span>-S/ ${descuentoMonto.toFixed(2)}</span></div>` : ''}
  ${pago.propina > 0 ? `<div class="fila"><span>Propina</span><span>S/ ${pago.propina.toFixed(2)}</span></div>` : ''}
  <div class="linea"></div>
  <div class="fila total"><span>TOTAL</span><span>S/ ${pago.total.toFixed(2)}</span></div>
  <div class="linea"></div>
  <div class="fila"><span>Método de pago</span><span>${METODO_LABEL[pago.metodo]}</span></div>
  ${pago.vuelto > 0 ? `<div class="fila"><span>Vuelto</span><span>S/ ${pago.vuelto.toFixed(2)}</span></div>` : ''}
  <div class="footer centro">
    ¡Gracias por su visita!<br/>
    Vuelva pronto 🐷
  </div>
</body></html>`

  abrirEImprimir(html)
}

// ── Ticket de comanda para cocina / bar ─────────────────────────────────────

export function imprimirTicketComanda(comanda: Comanda, items: ItemComanda[], area: 'cocina' | 'bar'): void {
  if (items.length === 0) return
  const ancho = anchoDeArea(area)
  const fecha = new Date()
  const areaLabel = area === 'cocina' ? 'COCINA' : 'BAR'

  const itemsHtml = items.map((i) => `
    <div class="item">
      <div class="item-nombre"><span>${i.cantidad}x ${escapeHtml(i.nombre)}</span></div>
      ${i.tipoPlato ? `<div class="item-detalle"><span class="badge">${i.tipoPlato === 'plato' ? 'PLATO' : 'FUENTE'}</span></div>` : ''}
      ${i.guarniciones?.length ? `<div class="item-detalle">${i.guarniciones.join(', ')}</div>` : ''}
      ${i.nota ? `<div class="item-detalle">⚠ ${escapeHtml(i.nota)}</div>` : ''}
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${areaLabel} — Mesa ${mesaLabel(comanda)}</title><style>${estilosBase(ancho)}</style></head>
<body>
  ${encabezadoLogo(areaLabel)}
  <div class="linea"></div>
  <div class="centro mesa-grande">MESA ${mesaLabel(comanda)}</div>
  <div class="fila"><span>Mozo</span><span>${escapeHtml(comanda.mozo)}</span></div>
  <div class="fila"><span>Hora</span><span>${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="linea"></div>
  ${itemsHtml}
  <div class="linea"></div>
  <div class="footer centro">Comanda #${comanda.id.slice(0, 8).toUpperCase()}</div>
</body></html>`

  abrirEImprimir(html)
}
