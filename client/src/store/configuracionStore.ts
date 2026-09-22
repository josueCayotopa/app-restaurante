import { create } from 'zustand'

export type AreaImpresora = 'cocina' | 'bar' | 'caja'
export type TipoConexion = 'red' | 'usb' | 'bluetooth'
export type AnchoTicket = '58mm' | '80mm'

export interface Impresora {
  id: string
  nombre: string
  area: AreaImpresora
  tipo: TipoConexion
  ip?: string
  puerto: number
  ancho: AnchoTicket
  activa: boolean
}

interface ConfiguracionState {
  impresoras: Impresora[]
  agregar: (imp: Omit<Impresora, 'id'>) => void
  actualizar: (id: string, cambios: Partial<Omit<Impresora, 'id'>>) => void
  eliminar: (id: string) => void
  toggleActiva: (id: string) => void
}

const MOCK_IMPRESORAS: Impresora[] = [
  {
    id: 'imp1',
    nombre: 'Epson TM-T20 Cocina',
    area: 'cocina',
    tipo: 'red',
    ip: '192.168.1.101',
    puerto: 9100,
    ancho: '80mm',
    activa: true,
  },
  {
    id: 'imp2',
    nombre: 'Star TSP143 Bar',
    area: 'bar',
    tipo: 'red',
    ip: '192.168.1.102',
    puerto: 9100,
    ancho: '80mm',
    activa: true,
  },
  {
    id: 'imp3',
    nombre: 'Epson TM-T88 Caja',
    area: 'caja',
    tipo: 'usb',
    puerto: 9100,
    ancho: '80mm',
    activa: true,
  },
]

export const useConfiguracionStore = create<ConfiguracionState>((set) => ({
  impresoras: MOCK_IMPRESORAS,

  agregar: (imp) =>
    set((s) => ({
      impresoras: [...s.impresoras, { ...imp, id: `imp${Date.now()}` }],
    })),

  actualizar: (id, cambios) =>
    set((s) => ({
      impresoras: s.impresoras.map((i) => (i.id === id ? { ...i, ...cambios } : i)),
    })),

  eliminar: (id) =>
    set((s) => ({ impresoras: s.impresoras.filter((i) => i.id !== id) })),

  toggleActiva: (id) =>
    set((s) => ({
      impresoras: s.impresoras.map((i) => (i.id === id ? { ...i, activa: !i.activa } : i)),
    })),
}))
