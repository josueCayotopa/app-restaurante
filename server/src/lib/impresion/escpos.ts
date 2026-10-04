import net from 'net'
import type { Documento, Linea, Tamano } from './documento'

// ── Conversión a ESC/POS (Epson y compatibles: Xprinter, Bixolon, 3nStar…) ──

const ESC = 0x1b, GS = 0x1d

// Página de códigos PC850 (ESC t 2): la soportan prácticamente todas las térmicas y trae tildes y ñ
const CP850: Record<string, number> = {
  'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5, 'ü': 0x81, 'Ü': 0x9a,
  'Á': 0xb5, 'É': 0x90, 'Í': 0xd6, 'Ó': 0xe0, 'Ú': 0xe9, '¿': 0xa8, '¡': 0xad, '°': 0xf8, 'º': 0xa7, 'ª': 0xa6,
  '·': 0xfa, '×': 0x9e, '–': 0x2d, '—': 0x2d, '−': 0x2d, '‘': 0x27, '’': 0x27, '“': 0x22, '”': 0x22, '…': 0x2e,
}

// Caracteres imprimibles: sin emojis, acentos raros reducidos a su letra base.
// Respeta los espacios (las filas los usan para alinear el precio a la derecha).
function limpiarCaracteres(s: string): string {
  return [...s].map((ch) => {
    if (CP850[ch] !== undefined || (ch >= ' ' && ch <= '~')) return ch
    if (/\s/.test(ch)) return ' '   // espacios raros (ej. el de "p. m.") → espacio normal
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    return base.length === 1 && base >= ' ' && base <= '~' ? base : ''
  }).join('')
}

// Texto para partir en renglones: además colapsa espacios repetidos
export function limpiarTexto(s: string): string {
  return limpiarCaracteres(s).replace(/\s+/g, ' ').trim()
}

function codificar(s: string): number[] {
  return [...limpiarCaracteres(s)].map((ch) => CP850[ch] ?? ch.charCodeAt(0))
}

const columnasDe = (anchoMm: number) => (anchoMm <= 58 ? 32 : 48)
const factorAncho = (tam?: Tamano) => (tam === 2 ? 2 : 1)

function tamanoBytes(tam?: Tamano): number[] {
  const n = tam === 2 ? 0x11 : tam === 'alto' ? 0x01 : 0x00
  return [GS, 0x21, n]
}

// Parte un texto en renglones de como máximo `max` caracteres, respetando palabras
export function partir(s: string, max: number): string[] {
  const palabras = limpiarTexto(s).split(' ')
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    if (p.length > max) {
      if (actual) { lineas.push(actual); actual = '' }
      for (let i = 0; i < p.length; i += max) lineas.push(p.slice(i, i + max))
      continue
    }
    if ((actual ? actual.length + 1 : 0) + p.length > max) { lineas.push(actual); actual = p }
    else actual = actual ? `${actual} ${p}` : p
  }
  if (actual || lineas.length === 0) lineas.push(actual)
  return lineas
}

function lineaABytes(l: Linea, cols: number): number[] {
  const out: number[] = []
  const nl = () => out.push(0x0a)
  switch (l.t) {
    case 'logo':
      return []   // el logo solo se dibuja en el navegador; en térmica va el nombre en grande
    case 'espacio':
      return [0x0a]
    case 'separador':
      out.push(ESC, 0x61, 0, ...codificar((l.doble ? '=' : '-').repeat(cols))); nl()
      return out
    case 'texto': {
      const max = Math.floor(cols / factorAncho(l.tam))
      out.push(ESC, 0x61, l.alinear === 'centro' ? 1 : l.alinear === 'der' ? 2 : 0)
      out.push(ESC, 0x45, l.negrita ? 1 : 0, ...tamanoBytes(l.tam))
      if (l.invertido) out.push(GS, 0x42, 1)
      // Respeta la sangría inicial (detalle de guarniciones y notas bajo cada plato)
      const sangria = ' '.repeat(l.texto.length - l.texto.trimStart().length)
      for (const r of partir(l.texto, max - sangria.length)) { out.push(...codificar(sangria + r)); nl() }
      if (l.invertido) out.push(GS, 0x42, 0)
      out.push(ESC, 0x45, 0, ...tamanoBytes(1), ESC, 0x61, 0)
      return out
    }
    case 'fila': {
      const max = Math.floor(cols / factorAncho(l.tam))
      const der = limpiarTexto(l.der)
      const espacioIzq = Math.max(4, max - der.length - 1)
      const renglones = partir(l.izq, espacioIzq)
      out.push(ESC, 0x61, 0, ESC, 0x45, l.negrita ? 1 : 0, ...tamanoBytes(l.tam))
      renglones.forEach((r, i) => {
        const fin = i === renglones.length - 1 ? der : ''
        out.push(...codificar(r.padEnd(max - fin.length) + fin)); nl()
      })
      out.push(ESC, 0x45, 0, ...tamanoBytes(1))
      return out
    }
  }
}

export function aEscPos(doc: Documento, anchoMm: number, copias = 1): Buffer {
  const cols = columnasDe(anchoMm)
  const cuerpo: number[] = []
  for (const l of doc.lineas) cuerpo.push(...lineaABytes(l, cols))
  const bytes: number[] = [ESC, 0x40, ESC, 0x74, 2]   // inicializar + página de códigos PC850
  if (doc.abrirGaveta) bytes.push(ESC, 0x70, 0, 25, 250)   // pulso a la gaveta (pin 2)
  for (let c = 0; c < Math.max(1, copias); c++) {
    bytes.push(...cuerpo, ESC, 0x64, 4, GS, 0x56, 0x42, 3)   // avanzar papel y corte parcial
  }
  return Buffer.from(bytes)
}

// ── Envío por red (puerto RAW, normalmente 9100) ──

export function enviarPorRed(ip: string, puerto: number, datos: Buffer, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ip, port: puerto })
    let terminado = false
    const fin = (err?: Error) => {
      if (terminado) return
      terminado = true
      socket.destroy()
      if (err) reject(err); else resolve()
    }
    socket.setTimeout(timeoutMs, () => fin(new Error(`La impresora ${ip}:${puerto} no responde (¿apagada o sin papel?)`)))
    socket.on('error', (e: NodeJS.ErrnoException) => {
      const msg = e.code === 'ECONNREFUSED' ? `La impresora ${ip}:${puerto} rechazó la conexión (revisa el puerto)`
        : e.code === 'EHOSTUNREACH' || e.code === 'ENETUNREACH' ? `No se encuentra ${ip} en la red`
        : e.code === 'ETIMEDOUT' ? `La impresora ${ip}:${puerto} no responde (¿apagada?)`
        : `Error de conexión con ${ip}:${puerto}: ${e.message}`
      fin(new Error(msg))
    })
    // Tras escribir, se espera un momento antes de cerrar: algunas térmicas cortan el ticket
    // si la conexión se destruye apenas se entrega el último byte.
    socket.on('connect', () => socket.end(datos, () => setTimeout(() => fin(), 400)))
  })
}
