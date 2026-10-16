import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

// Errores inesperados: el detalle técnico queda en el log del servidor y al usuario le llega
// un mensaje claro (antes se mostraba el error de Prisma con la IP de la base de datos).
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message)

  const codigo = (err as { code?: string }).code
  const sinBaseDeDatos =
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(codigo ?? '') ||
    /can't reach database server|connection.*(refused|closed|reset)|timed out fetching a new connection/i.test(err.message)

  if (sinBaseDeDatos) {
    res.status(503).json({ error: 'No hay conexión con la base de datos. Intenta de nuevo en unos minutos; si sigue, avisa al administrador.' })
    return
  }
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo; si se repite, avisa al administrador.' })
}
