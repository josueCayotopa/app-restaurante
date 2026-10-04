import type { PrismaClient } from '@prisma/client'

// La carta pública se arma desde Producto: cada producto tiene una sección de carta y
// los tamaños salen del nombre ("Chicharrón (Personal)" / "Chicharrón (Fuente)").

export const SECCIONES_CARTA = [
  'plato', 'chaufa', 'caldo', 'guarnicion', 'guarnicion_extra',
  'bebida_caliente', 'bebida_fria_jarra', 'bebida_fria_gaseosa',
] as const

const BEBIDAS_CALIENTES = ['anis', 'cafe pasado', 'hierba luisa', 'manzanilla', 'te']

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// "Chicharrón (Personal)" → { base: "Chicharrón", tamano: "Personal" }
export function baseYTamano(nombre: string) {
  const m = nombre.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  return m ? { base: m[1], tamano: m[2] } : { base: nombre, tamano: null }
}

// Sección de carta que le corresponde a un producto según su nombre y categoría
export function seccionPorDefecto(nombre: string, categoria: string): string | null {
  const base = normalizar(baseYTamano(nombre).base)
  if (categoria === 'fondos' || categoria === 'entradas') {
    if (base.startsWith('chaufa')) return 'chaufa'
    if (base.startsWith('caldo')) return 'caldo'
    return 'plato'
  }
  if (categoria === 'extras') {
    if (base.startsWith('guarnicion') || base === 'tamales' || base === 'humitas') return 'guarnicion'
    return 'guarnicion_extra'
  }
  if (categoria === 'bebidas') {
    if (BEBIDAS_CALIENTES.includes(base)) return 'bebida_caliente'
    if (base.startsWith('jarra')) return 'bebida_fria_jarra'
    return 'bebida_fria_gaseosa'
  }
  if (categoria === 'cocteles') return 'bebida_fria_gaseosa'
  return null
}

// Palabras comparables: "1 Lt" ≈ "1L", "625 ml" ≈ "625ml"
const tokens = (s: string) =>
  normalizar(s)
    .replace(/(\d)\s+(l|lt|ml)\b/g, '$1$2')
    .replace(/(\d)lt\b/g, '$1l')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/**
 * Asigna seccionCarta/ordenCarta a los productos que aún no tienen sección.
 * Si se pasa la carta antigua (ItemCarta), respeta su orden y copia su foto a los
 * productos que no tengan una.
 */
export async function asignarSeccionesCarta(
  prisma: PrismaClient,
  cartaAntigua: { seccion: string; nombre: string; orden: number; imagen: string | null }[] = [],
) {
  const productos = await prisma.producto.findMany({ where: { seccionCarta: null } })
  let asignados = 0
  for (const p of productos) {
    const seccion = seccionPorDefecto(p.nombre, p.categoria)
    if (!seccion) continue
    const tp = tokens(baseYTamano(p.nombre).base)
    // La coincidencia más específica gana ("Cecina en sarza" antes que "Cecina")
    const match = cartaAntigua
      .filter((it) => it.seccion === seccion && tokens(it.nombre).every((t) => tp.includes(t)))
      .sort((a, b) => tokens(b.nombre).length - tokens(a.nombre).length)[0]
    await prisma.producto.update({
      where: { id: p.id },
      data: {
        seccionCarta: seccion,
        ordenCarta: match?.orden ?? 1000,
        ...(match?.imagen && !p.imagen ? { imagen: match.imagen } : {}),
      },
    })
    asignados++
  }
  return asignados
}
