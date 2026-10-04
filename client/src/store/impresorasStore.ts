import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export type AreaImpresora = 'cocina' | 'bar' | 'caja'
// red: térmica con LAN (el servidor le envía el ticket) · equipo: USB conectada a una PC/tablet
export type TipoImpresora = 'red' | 'equipo'

export interface Impresora {
  id: string
  nombre: string
  area: AreaImpresora
  tipo: TipoImpresora
  ip?: string | null
  puerto: number
  ancho: 58 | 80
  activa: boolean
  autoImprimir: boolean
  copias: number
  abrirGaveta: boolean
}

export type DatosImpresora = Omit<Impresora, 'id'>
type Interruptor = 'activa' | 'autoImprimir' | 'abrirGaveta'

interface ImpresorasState {
  impresoras: Impresora[]
  cargado: boolean
  cargar:    () => Promise<void>
  crear:     (d: DatosImpresora) => Promise<void>
  actualizar:(id: string, d: DatosImpresora) => Promise<void>
  alternar:  (id: string, campo: Interruptor) => Promise<void>
  eliminar:  (id: string) => Promise<void>
  probar:    (id: string) => Promise<void>
}

export const useImpresorasStore = create<ImpresorasState>((set, get) => {
  const reemplazar = (imp: Impresora) => set((s) => ({ impresoras: s.impresoras.map((i) => (i.id === imp.id ? imp : i)) }))
  return {
    impresoras: [],
    cargado: false,
    cargar: async () => set({ impresoras: await apiFetch<Impresora[]>('/api/impresoras'), cargado: true }),
    crear: async (d) => {
      const imp = await apiFetch<Impresora>('/api/impresoras', { method: 'POST', body: JSON.stringify(d) })
      set((s) => ({ impresoras: [...s.impresoras, imp] }))
    },
    actualizar: async (id, d) => reemplazar(await apiFetch<Impresora>(`/api/impresoras/${id}`, { method: 'PATCH', body: JSON.stringify(d) })),
    alternar: async (id, campo) => {
      const actual = get().impresoras.find((i) => i.id === id)
      if (!actual) return
      reemplazar(await apiFetch<Impresora>(`/api/impresoras/${id}`, { method: 'PATCH', body: JSON.stringify({ [campo]: !actual[campo] }) }))
    },
    eliminar: async (id) => {
      await apiFetch(`/api/impresoras/${id}`, { method: 'DELETE' })
      set((s) => ({ impresoras: s.impresoras.filter((i) => i.id !== id) }))
    },
    // Imprime de verdad un ticket de prueba; lanza error con el motivo si la impresora no responde
    probar: async (id) => { await apiFetch(`/api/impresoras/${id}/prueba`, { method: 'POST' }) },
  }
})
