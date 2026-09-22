import { create } from 'zustand'

export type SeccionCarta =
  | 'plato'
  | 'chaufa'
  | 'caldo'
  | 'guarnicion'
  | 'guarnicion_extra'
  | 'bebida_caliente'
  | 'bebida_fria_jarra'
  | 'bebida_fria_gaseosa'

export interface ItemCarta {
  id: string
  seccion: SeccionCarta
  nombre: string
  p1: string   // Personal / Chico / Precio
  p2: string   // Fuente / Grande / ""
  p3: string   // Mixto (solo chaufa) / ""
}

const items0: ItemCarta[] = [
  // ── Platos de la casa ────────────────────────────────────────
  { id: 'pl-1',  seccion: 'plato', nombre: 'Chicharrón',            p1: 'S/ 15.00',            p2: 'S/ 35.00',            p3: '' },
  { id: 'pl-2',  seccion: 'plato', nombre: 'Cecina',                p1: 'S/ 17.00',            p2: 'S/ 40.00',            p3: '' },
  { id: 'pl-3',  seccion: 'plato', nombre: 'Carne seca',            p1: 'S/ 18.00',            p2: 'S/ 45.00',            p3: '' },
  { id: 'pl-4',  seccion: 'plato', nombre: 'Tilapia según tamaño',  p1: 'S/ 14.00 – S/ 18.00', p2: 'S/ 18.00 – S/ 35.00', p3: '' },
  { id: 'pl-5',  seccion: 'plato', nombre: 'Cuy',                   p1: 'S/ 18.00',            p2: 'S/ 60.00',            p3: '' },
  { id: 'pl-6',  seccion: 'plato', nombre: 'Tortilla de salchicha', p1: 'S/ 10.00',            p2: '—',                   p3: '' },
  { id: 'pl-7',  seccion: 'plato', nombre: 'Hígadito de cuy',       p1: 'S/ 15.00',            p2: '—',                   p3: '' },
  { id: 'pl-8',  seccion: 'plato', nombre: 'Arroz con pato',        p1: 'S/ 19.00',            p2: '—',                   p3: '' },
  { id: 'pl-9',  seccion: 'plato', nombre: 'Cabrito',               p1: 'S/ 19.00',            p2: '—',                   p3: '' },
  { id: 'pl-10', seccion: 'plato', nombre: 'Pellejito en sarza',    p1: 'S/ 20.00',            p2: 'S/ 35.00',            p3: '' },
  { id: 'pl-11', seccion: 'plato', nombre: 'Cecina en sarza',       p1: 'S/ 20.00',            p2: 'S/ 40.00',            p3: '' },
  { id: 'pl-12', seccion: 'plato', nombre: 'Carne seca en sarza',   p1: 'S/ 25.00',            p2: 'S/ 45.00',            p3: '' },

  // ── Chaufas (p1=Personal, p2=Mixto, p3=Fuente) ───────────────
  { id: 'ch-1', seccion: 'chaufa', nombre: 'De chancho',    p1: 'S/ 14.00', p2: 'S/ 25.00', p3: 'S/ 30.00' },
  { id: 'ch-2', seccion: 'chaufa', nombre: 'De cecina',     p1: 'S/ 18.00', p2: 'S/ 25.00', p3: 'S/ 35.00' },
  { id: 'ch-3', seccion: 'chaufa', nombre: 'De carne seca', p1: 'S/ 18.00', p2: 'S/ 25.00', p3: 'S/ 35.00' },

  // ── Caldos ───────────────────────────────────────────────────
  { id: 'ca-1', seccion: 'caldo', nombre: 'Pata + guarnición',     p1: 'S/ 12.00',           p2: '', p3: '' },
  { id: 'ca-2', seccion: 'caldo', nombre: 'Gallina + guarnición',  p1: 'S/ 12.00 / S/ 15.00', p2: '', p3: '' },
  { id: 'ca-3', seccion: 'caldo', nombre: 'Shurumbo + guarnición', p1: 'S/ 12.00',           p2: '', p3: '' },

  // ── Guarniciones (p1=Chico, p2=Grande) ───────────────────────
  { id: 'gu-1', seccion: 'guarnicion', nombre: 'Arroz',        p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-2', seccion: 'guarnicion', nombre: 'Papa guisada', p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-3', seccion: 'guarnicion', nombre: 'Mote',         p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-4', seccion: 'guarnicion', nombre: 'Yuca',         p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-5', seccion: 'guarnicion', nombre: 'Menestra',     p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-6', seccion: 'guarnicion', nombre: 'Chifles',      p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-7', seccion: 'guarnicion', nombre: 'Cancha',       p1: 'S/ 3.00', p2: 'S/ 5.00', p3: '' },
  { id: 'gu-8', seccion: 'guarnicion', nombre: 'Tamales',      p1: 'S/ 1.50', p2: '—',       p3: '' },
  { id: 'gu-9', seccion: 'guarnicion', nombre: 'Humitas',      p1: 'S/ 1.50', p2: '—',       p3: '' },

  // ── Guarniciones extras ───────────────────────────────────────
  { id: 'ge-1', seccion: 'guarnicion_extra', nombre: 'Papa frita',         p1: 'S/ 5.00', p2: '', p3: '' },
  { id: 'ge-2', seccion: 'guarnicion_extra', nombre: 'Yuca frita',         p1: 'S/ 5.00', p2: '', p3: '' },
  { id: 'ge-3', seccion: 'guarnicion_extra', nombre: 'Camote frito',       p1: 'S/ 5.00', p2: '', p3: '' },
  { id: 'ge-4', seccion: 'guarnicion_extra', nombre: 'Tamal frito',        p1: 'S/ 3.00', p2: '', p3: '' },
  { id: 'ge-5', seccion: 'guarnicion_extra', nombre: 'Humita frita',       p1: 'S/ 3.00', p2: '', p3: '' },
  { id: 'ge-6', seccion: 'guarnicion_extra', nombre: 'Wantán frito',       p1: 'S/ 4.00', p2: '', p3: '' },
  { id: 'ge-7', seccion: 'guarnicion_extra', nombre: 'Zarandaja refrita',  p1: 'S/ 5.00', p2: '', p3: '' },

  // ── Bebidas calientes ─────────────────────────────────────────
  { id: 'bc-1', seccion: 'bebida_caliente', nombre: 'Café pasado',  p1: 'S/ 2.00', p2: '', p3: '' },
  { id: 'bc-2', seccion: 'bebida_caliente', nombre: 'Manzanilla',   p1: 'S/ 2.00', p2: '', p3: '' },
  { id: 'bc-3', seccion: 'bebida_caliente', nombre: 'Anís',         p1: 'S/ 2.00', p2: '', p3: '' },
  { id: 'bc-4', seccion: 'bebida_caliente', nombre: 'Hierba luisa', p1: 'S/ 2.00', p2: '', p3: '' },
  { id: 'bc-5', seccion: 'bebida_caliente', nombre: 'Té',           p1: 'S/ 2.00', p2: '', p3: '' },

  // ── Bebidas frías — jarras ────────────────────────────────────
  { id: 'bj-1', seccion: 'bebida_fria_jarra', nombre: '1 L Chicha de jora', p1: 'S/ 7.00', p2: '', p3: '' },
  { id: 'bj-2', seccion: 'bebida_fria_jarra', nombre: '1 L Chicha morada',  p1: 'S/ 7.00', p2: '', p3: '' },
  { id: 'bj-3', seccion: 'bebida_fria_jarra', nombre: '1 L Cebada',         p1: 'S/ 7.00', p2: '', p3: '' },
  { id: 'bj-4', seccion: 'bebida_fria_jarra', nombre: '1 L Carambola',      p1: 'S/ 7.00', p2: '', p3: '' },
  { id: 'bj-5', seccion: 'bebida_fria_jarra', nombre: '1 L Maracuyá',       p1: 'S/ 7.00', p2: '', p3: '' },

  // ── Bebidas frías — gaseosas ──────────────────────────────────
  { id: 'bg-1',  seccion: 'bebida_fria_gaseosa', nombre: '296 ml Inca/Coca personal', p1: 'S/ 2.50',  p2: '', p3: '' },
  { id: 'bg-2',  seccion: 'bebida_fria_gaseosa', nombre: '625 ml Gordita',            p1: 'S/ 5.00',  p2: '', p3: '' },
  { id: 'bg-3',  seccion: 'bebida_fria_gaseosa', nombre: '1 Lt Coca/Inca/Fanta',      p1: 'S/ 8.00',  p2: '', p3: '' },
  { id: 'bg-4',  seccion: 'bebida_fria_gaseosa', nombre: '1.5 Lt Inca/Coca/Fanta',    p1: 'S/ 12.00', p2: '', p3: '' },
  { id: 'bg-5',  seccion: 'bebida_fria_gaseosa', nombre: '2 Lt Inca/Coca',            p1: 'S/ 16.00', p2: '', p3: '' },
  { id: 'bg-6',  seccion: 'bebida_fria_gaseosa', nombre: 'Sporade',                   p1: 'S/ 2.50',  p2: '', p3: '' },
  { id: 'bg-7',  seccion: 'bebida_fria_gaseosa', nombre: '1/2 Lt Agua',               p1: 'S/ 2.50',  p2: '', p3: '' },
  { id: 'bg-8',  seccion: 'bebida_fria_gaseosa', nombre: '1 Lt Agua',                 p1: 'S/ 3.50',  p2: '', p3: '' },
  { id: 'bg-9',  seccion: 'bebida_fria_gaseosa', nombre: 'Pilsen',                    p1: 'S/ 9.00',  p2: '', p3: '' },
  { id: 'bg-10', seccion: 'bebida_fria_gaseosa', nombre: 'Trigo',                     p1: 'S/ 10.00', p2: '', p3: '' },
  { id: 'bg-11', seccion: 'bebida_fria_gaseosa', nombre: 'Negra',                     p1: 'S/ 10.00', p2: '', p3: '' },
]

interface CartaPublicaState {
  items: ItemCarta[]
  agregar:    (datos: Omit<ItemCarta, 'id'>) => void
  actualizar: (id: string, datos: Omit<ItemCarta, 'id'>) => void
  eliminar:   (id: string) => void
  deSeccion:  (s: SeccionCarta) => ItemCarta[]
}

export const useCartaPublicaStore = create<CartaPublicaState>((set, get) => ({
  items: items0,
  agregar: (datos) =>
    set((s) => ({ items: [...s.items, { ...datos, id: `item-${Date.now()}` }] })),
  actualizar: (id, datos) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...datos } : i)) })),
  eliminar: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  deSeccion: (s) =>
    get().items.filter((i) => i.seccion === s),
}))
