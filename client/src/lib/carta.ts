import type { Producto } from '../types'

// La carta pública se arma desde los productos: cada producto indica su sección
// (Producto.seccionCarta) y el tamaño sale del nombre: "Chicharrón (Personal)".

export type SeccionCarta =
  | 'plato'
  | 'chaufa'
  | 'caldo'
  | 'guarnicion'
  | 'guarnicion_extra'
  | 'bebida_caliente'
  | 'bebida_fria_jarra'
  | 'bebida_fria_gaseosa'

// Columnas de precio por sección (null = una sola columna "Precio")
export const SECCION_CFG: Record<SeccionCarta, { label: string; columnas: string[] | null; categoria: string }> = {
  plato:               { label: 'Plato de la Casa',    columnas: ['Personal', 'Fuente'],          categoria: 'fondos'  },
  chaufa:              { label: 'Chaufa',              columnas: ['Personal', 'Mixto', 'Fuente'], categoria: 'fondos'  },
  caldo:               { label: 'Caldo',               columnas: null,                            categoria: 'fondos'  },
  guarnicion:          { label: 'Guarnición',          columnas: ['Chico', 'Grande'],             categoria: 'extras'  },
  guarnicion_extra:    { label: 'Guarnición Extra',    columnas: null,                            categoria: 'extras'  },
  bebida_caliente:     { label: 'Bebida Caliente',     columnas: null,                            categoria: 'bebidas' },
  bebida_fria_jarra:   { label: 'Bebida Fría (Jarra)', columnas: null,                            categoria: 'bebidas' },
  bebida_fria_gaseosa: { label: 'Gaseosa / Bebida',    columnas: null,                            categoria: 'bebidas' },
}

// "Chicharrón (Personal)" → { base: "Chicharrón", tamano: "Personal" }
export function baseYTamano(nombre: string): { base: string; tamano: string | null } {
  const m = nombre.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  return m ? { base: m[1], tamano: m[2] } : { base: nombre, tamano: null }
}

export function nombreConTamano(base: string, tamano: string | null | undefined) {
  const t = tamano?.trim()
  return t ? `${base.trim()} (${t})` : base.trim()
}

// Una fila de la carta = todos los tamaños de un mismo plato
export interface FilaCarta {
  clave: string
  seccion: SeccionCarta
  nombre: string
  productos: Producto[]
  imagen?: string
  disponible: boolean   // al menos un tamaño disponible
}

const precio = (p: Producto) => `S/ ${p.precio.toFixed(2)}`

export function filasDeSeccion(productos: Producto[], seccion: SeccionCarta): FilaCarta[] {
  const grupos = new Map<string, Producto[]>()
  for (const p of productos) {
    if (p.seccionCarta !== seccion) continue
    const { base } = baseYTamano(p.nombre)
    const clave = base.toLowerCase()
    grupos.set(clave, [...(grupos.get(clave) ?? []), p])
  }
  const orden = (ps: Producto[]) => Math.min(...ps.map((p) => p.ordenCarta ?? 0))
  return [...grupos.entries()]
    .sort(([ka, a], [kb, b]) => orden(a) - orden(b) || ka.localeCompare(kb))
    .map(([clave, ps]) => ({
      clave: `${seccion}:${clave}`,
      seccion,
      nombre: baseYTamano(ps[0].nombre).base,
      productos: ps.sort((a, b) => a.precio - b.precio),
      imagen: ps.find((p) => p.imagen)?.imagen,
      disponible: ps.some((p) => p.disponible),
    }))
}

// Precio a mostrar en cada columna de la sección ("—" si ese tamaño no existe)
export function preciosDeFila(fila: FilaCarta): string[] {
  const columnas = SECCION_CFG[fila.seccion].columnas
  if (!columnas) return [fila.productos.map(precio).join(' / ')]
  return columnas.map((col, i) => {
    const p = fila.productos.find((x) => {
      const t = baseYTamano(x.nombre).tamano
      return t ? t.toLowerCase() === col.toLowerCase() : i === 0   // sin tamaño → primera columna
    })
    return p ? precio(p) : '—'
  })
}
