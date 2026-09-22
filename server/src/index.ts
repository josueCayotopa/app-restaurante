import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import http from 'http'
import path from 'path'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

import { errorHandler } from './middleware/errorHandler'
import { registrarHandlers } from './sockets/handlers'
import { setIo } from './sockets/io'

import authRoutes        from './routes/auth'
import mesasRoutes       from './routes/mesas'
import productosRoutes   from './routes/productos'
import comandasRoutes    from './routes/comandas'
import turnosRoutes      from './routes/turnos'
import usuariosRoutes    from './routes/usuarios'
import reservasRoutes    from './routes/reservas'
import inventarioRoutes  from './routes/inventario'
import proveedoresRoutes from './routes/proveedores'
import reportesRoutes    from './routes/reportes'
import uploadsRoutes     from './routes/uploads'

const app    = express()
const server = http.createServer(app)
const prisma = new PrismaClient()

// Permite el origin configurado explícitamente, o cualquier localhost/127.0.0.1
// en desarrollo (el puerto de Vite puede variar si 5173 está ocupado).
const origenPermitido = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) { cb(null, true); return }
  if (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN) { cb(null, true); return }
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) { cb(null, true); return }
  cb(null, false)
}

const io = new Server(server, {
  cors: { origin: origenPermitido, methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
})
setIo(io)

// ── Middlewares globales ──────────────────────────────────────────────────
app.use(cors({ origin: origenPermitido }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

// ── Rutas API ─────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes)
app.use('/api/mesas',       mesasRoutes)
app.use('/api/productos',   productosRoutes)
app.use('/api/comandas',    comandasRoutes)
app.use('/api/turnos',      turnosRoutes)
app.use('/api/usuarios',    usuariosRoutes)
app.use('/api/reservas',    reservasRoutes)
app.use('/api/inventario',  inventarioRoutes)
app.use('/api/proveedores', proveedoresRoutes)
app.use('/api/reportes',    reportesRoutes)
app.use('/api/uploads',     uploadsRoutes)

// ── 404 para rutas desconocidas ───────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// ── Error handler ─────────────────────────────────────────────────────────
app.use(errorHandler)

// ── Socket.io ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  registrarHandlers(io, socket)
})

// ── Arranque ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor SGR-CADE corriendo en http://localhost:${PORT}`)
  console.log(`   API: http://localhost:${PORT}/api/health`)
  console.log(`   WebSocket: ws://localhost:${PORT}\n`)
})

// Cierre limpio
process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  server.close(() => process.exit(0))
})

// Evita que un fallo transitorio de conexión a la base de datos (ej. el
// servidor Postgres remoto se corta un momento) tumbe todo el proceso.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})
