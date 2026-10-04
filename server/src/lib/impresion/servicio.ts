import { PrismaClient, type Impresora } from '@prisma/client'
import { getIo } from '../../sockets/io'
import { aEscPos, enviarPorRed } from './escpos'
import type { Documento } from './documento'

const prisma = new PrismaClient()

export type Area = 'cocina' | 'bar' | 'caja'

// Lista de impresoras en memoria: así un ticket de cocina sale apenas llega el pedido,
// sin esperar una consulta a la base de datos. Se refresca al crear/editar/borrar.
let cacheImpresoras: Impresora[] | null = null
async function impresoras(): Promise<Impresora[]> {
  if (!cacheImpresoras) cacheImpresoras = await prisma.impresora.findMany()
  return cacheImpresoras
}
export function invalidarImpresoras() { cacheImpresoras = null }

export interface Trabajo {
  id: string
  creadoEn: string
  impresoraId: string
  impresora: string
  area: string
  titulo: string
  estado: 'ok' | 'error' | 'enviando'
  error?: string
  documento: Documento
}

// Historial en memoria de los últimos trabajos (para ver qué falló y reintentar)
const historial: Trabajo[] = []
const MAX_HISTORIAL = 100
let contador = 0

function registrar(t: Trabajo) {
  historial.unshift(t)
  if (historial.length > MAX_HISTORIAL) historial.length = MAX_HISTORIAL
  getIo().emit('impresion:historial')
}
export const obtenerHistorial = () => historial.map(({ documento: _d, ...resto }) => resto)

// Impresora "equipo": se manda por socket; responde el equipo que la tiene marcada como suya
function enviarAEquipo(imp: Impresora, documento: Documento, trabajoId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getIo().timeout(8000).emit(
      'impresion:equipo',
      { trabajoId, impresoraId: imp.id, documento, ancho: imp.ancho, copias: imp.copias },
      (_err: Error | null, respuestas: boolean[]) => {
        if (respuestas?.some(Boolean)) resolve()
        else reject(new Error('Ningún equipo encendido tiene asignada esta impresora (Configuración → Este equipo)'))
      },
    )
  })
}

async function ejecutar(imp: Impresora, documento: Documento, trabajo: Trabajo) {
  try {
    if (imp.tipo === 'red') {
      if (!imp.ip) throw new Error('La impresora no tiene IP configurada')
      // La gaveta solo se abre si la impresora lo tiene habilitado
      const doc = { ...documento, abrirGaveta: !!documento.abrirGaveta && imp.abrirGaveta }
      await enviarPorRed(imp.ip, imp.puerto, aEscPos(doc, imp.ancho, imp.copias))
    } else {
      await enviarAEquipo(imp, documento, trabajo.id)
    }
    trabajo.estado = 'ok'
  } catch (e) {
    trabajo.estado = 'error'
    trabajo.error = e instanceof Error ? e.message : String(e)
    console.error(`[impresion] ${imp.nombre}: ${trabajo.error}`)
  }
  getIo().emit('impresion:historial')
}

/**
 * Imprime un documento en las impresoras activas de un área (o en una impresora concreta).
 * `soloAutomaticas`: para tickets que salen solos (pedidos), respeta el ajuste autoImprimir.
 * Devuelve sinImpresora=true si no hay a dónde mandarlo: el cliente puede imprimir localmente.
 */
export async function imprimir(
  area: Area,
  documento: Documento,
  opciones: { impresoraId?: string; soloAutomaticas?: boolean; esperar?: boolean } = {},
): Promise<{ sinImpresora: boolean; trabajos: Omit<Trabajo, 'documento'>[] }> {
  const destino = (await impresoras()).filter((i) =>
    opciones.impresoraId
      ? i.id === opciones.impresoraId
      : i.area === area && i.activa && (!opciones.soloAutomaticas || i.autoImprimir))
  if (destino.length === 0) return { sinImpresora: true, trabajos: [] }

  const trabajos = destino.map((imp) => {
    const t: Trabajo = {
      id: `${Date.now().toString(36)}-${(++contador).toString(36)}`,
      creadoEn: new Date().toISOString(),
      impresoraId: imp.id, impresora: imp.nombre, area: imp.area,
      titulo: documento.titulo, estado: 'enviando', documento,
    }
    registrar(t)
    return { t, promesa: ejecutar(imp, documento, t) }
  })
  // Por defecto no se bloquea la respuesta HTTP esperando a la impresora
  if (opciones.esperar) await Promise.all(trabajos.map((x) => x.promesa))
  return { sinImpresora: false, trabajos: trabajos.map(({ t: { documento: _d, ...resto } }) => resto) }
}

export async function reintentar(trabajoId: string) {
  const previo = historial.find((t) => t.id === trabajoId)
  if (!previo) return null
  return imprimir(previo.area as Area, previo.documento, { impresoraId: previo.impresoraId, esperar: true })
}
