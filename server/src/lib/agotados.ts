import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Día de hoy en Lima ("YYYY-MM-DD"): un producto marcado "agotado hoy" vuelve solo al día siguiente
export const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

export const estaAgotado = (p: { agotadoDia?: string | null }) => !!p.agotadoDia && p.agotadoDia === hoyLima()

// Nombres de los productos pedidos que hoy están agotados (vacío = se puede pedir todo)
export async function productosAgotados(productoIds: string[]): Promise<string[]> {
  if (productoIds.length === 0) return []
  const hoy = hoyLima()
  const agotados = await prisma.producto.findMany({
    where: { id: { in: [...new Set(productoIds)] }, agotadoDia: hoy },
    select: { nombre: true },
  })
  return agotados.map((p) => p.nombre)
}
