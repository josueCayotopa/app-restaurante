import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface MovimientoCaja {
  id: string
  tipo: 'ingreso' | 'retiro'
  monto: number
  concepto: string
  usuario?: string | null
  creadoEn: string
}

export interface CajaSesion {
  id: string
  estado: 'abierta' | 'cerrada'
  abiertaEn: string
  abiertaPor: string
  montoInicial: number
  cerradaEn?: string | null
  cerradaPor?: string | null
  efectivoCobrado?: number | null
  ingresos?: number | null
  retiros?: number | null
  efectivoEsperado?: number | null
  efectivoContado?: number | null
  diferencia?: number | null
  ventasNetas?: number | null
  propinas?: number | null
  tarjeta?: number | null
  yapePlin?: number | null
  pedidos?: number | null
  conteo?: string | null
  observaciones?: string | null
  movimientos?: MovimientoCaja[]
}

// Arqueo en vivo de la sesión abierta (lo calcula el servidor)
export interface Arqueo {
  pedidos: number
  ventasNetas: number
  propinas: number
  efectivoCobrado: number
  tarjeta: number
  yapePlin: number
  ingresos: number
  retiros: number
  efectivoEsperado: number
  pedidosSinCobrar: number
  movimientos: MovimientoCaja[]
}

interface RespuestaActual { sesion: CajaSesion | null; arqueo?: Arqueo; denominaciones?: number[] }

interface CajaState {
  sesion: CajaSesion | null
  arqueo: Arqueo | null
  denominaciones: number[]
  cargado: boolean
  cargar:     () => Promise<void>
  abrir:      (montoInicial: number) => Promise<void>
  movimiento: (tipo: 'ingreso' | 'retiro', monto: number, concepto: string) => Promise<void>
  cerrar:     (datos: { efectivoContado: number; conteo?: Record<string, number>; observaciones?: string }) => Promise<CajaSesion>
}

export const useCajaStore = create<CajaState>((set) => {
  const aplicar = (r: RespuestaActual) =>
    set({ sesion: r.sesion, arqueo: r.arqueo ?? null, denominaciones: r.denominaciones ?? [], cargado: true })

  return {
    sesion: null,
    arqueo: null,
    denominaciones: [],
    cargado: false,

    cargar: async () => aplicar(await apiFetch<RespuestaActual>('/api/caja/actual')),
    abrir: async (montoInicial) =>
      aplicar(await apiFetch<RespuestaActual>('/api/caja/abrir', { method: 'POST', body: JSON.stringify({ montoInicial }) })),
    movimiento: async (tipo, monto, concepto) =>
      aplicar(await apiFetch<RespuestaActual>('/api/caja/movimientos', { method: 'POST', body: JSON.stringify({ tipo, monto, concepto }) })),
    cerrar: async (datos) => {
      const cerrada = await apiFetch<CajaSesion>('/api/caja/cerrar', { method: 'POST', body: JSON.stringify(datos) })
      set({ sesion: null, arqueo: null })
      return cerrada
    },
  }
})
