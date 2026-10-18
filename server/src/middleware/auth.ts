import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
// La sesión dura 12 h, pero se renueva sola mientras se usa: cuando le quedan menos de 6 h,
// la respuesta trae un token nuevo en la cabecera X-Token-Renovado. Así una pantalla de
// Cocina/Bar abierta todo el día no se queda sin sesión (antes, al vencer, sus cambios se perdían).
const RENOVAR_SI_QUEDAN_MS = 6 * 3600 * 1000

const SECRET = process.env.JWT_SECRET || 'sgr-cade-secret'
// La clave por defecto está en el repositorio (público): con ella cualquiera podría fabricar una sesión
if (!process.env.JWT_SECRET) {
  console.error('⚠️  [SEGURIDAD] Falta JWT_SECRET en server/.env: se está usando la clave por defecto. Define una clave larga y aleatoria.')
}

export interface JwtPayload {
  id: string
  email: string
  rol: string
}

declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  try {
    const token = header.slice(7)
    const datos = jwt.verify(token, SECRET) as JwtPayload & { exp?: number }
    req.usuario = { id: datos.id, email: datos.email, rol: datos.rol }
    if (datos.exp && datos.exp * 1000 - Date.now() < RENOVAR_SI_QUEDAN_MS) {
      // Solo se renueva si el usuario sigue activo (un usuario desactivado pierde la sesión al vencer)
      prisma.usuario.findUnique({ where: { id: datos.id }, select: { activo: true, rol: true, email: true } })
        .then((u) => {
          if (u?.activo) res.setHeader('X-Token-Renovado', firmarToken({ id: datos.id, email: u.email, rol: u.rol }))
        })
        .catch(() => { /* sin base de datos: se renueva en la próxima petición */ })
        .finally(() => next())
      return
    }
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function requerirRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ error: 'Sin permisos para esta acción' })
      return
    }
    next()
  }
}

export function firmarToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' })
}
