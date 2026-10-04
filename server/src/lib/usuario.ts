import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Nombre del usuario autenticado (el token solo trae id/email/rol)
export async function nombreDeUsuario(usuarioId?: string): Promise<string | null> {
  if (!usuarioId) return null
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nombre: true } })
  return u?.nombre ?? null
}

// Usuario de ingreso: el personal entra con un nombre corto ("maria"); internamente es
// "maria@cade.pe". Sin tildes ni mayúsculas, para que "María" y "maria" sean lo mismo.
export const DOMINIO_LOCAL = 'cade.pe'
export function normalizarLogin(valor: unknown): string {
  const limpio = String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quita tildes
    .replace(/\s+/g, '')
  if (!limpio) return ''
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_LOCAL}`
}
