import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'sgr-cade-secret'

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
    req.usuario = jwt.verify(token, SECRET) as JwtPayload
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
