import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

import { errorHandler } from './middleware/errorHandler'
import { registrarHandlers } from './sockets/handlers'
import { setIo } from './sockets/io'
import { CARPETA_UPLOADS, CARPETA_CLIENTE } from './lib/rutas'

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
import zonasRoutes       from './routes/zonas'
import cartaRoutes       from './routes/carta'
import categoriasRoutes  from './routes/categorias'
import cajaRoutes        from './routes/caja'
import impresionRoutes   from './routes/impresion'
import recetasRoutes     from './routes/recetas'

const app    = express()
const server = http.createServer(app)
const prisma = new PrismaClient()

// Permite el origin configurado explícitamente, o cualquier localhost/127.0.0.1
// en desarrollo (el puerto de Vite puede variar si 5173 está ocupado).
const origenPermitido = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) { cb(null, true); return }
  // Dominio(s) de la app web en producción, separados por coma (ej. https://sistema.chicharroneriacade.com)
  const permitidos = (process.env.CLIENT_ORIGIN ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
  if (permitidos.includes(origin)) { cb(null, true); return }
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) { cb(null, true); return }
  // Tablets y pantallas dentro del local (red privada: 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) { cb(null, true); return }
  cb(null, false)
}

const io = new Server(server, {
  cors: { origin: origenPermitido, methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
})
setIo(io)

// ── Middlewares globales ──────────────────────────────────────────────────
app.use(cors({ origin: origenPermitido }))
app.use(express.json())
app.use('/uploads', express.static(CARPETA_UPLOADS))

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
app.use('/api/zonas',       zonasRoutes)
app.use('/api/carta',       cartaRoutes)
app.use('/api/categorias',  categoriasRoutes)
app.use('/api/caja',        cajaRoutes)
app.use('/api/recetas',     recetasRoutes)
app.use('/api',             impresionRoutes)   // /api/impresoras y /api/impresion/*

// ── App web (PWA) compilada ───────────────────────────────────────────────
// Si existe client/dist (npm run build en client), el mismo servidor la sirve:
// las tablets del local solo abren http://IP-DE-ESTA-PC:3001
const distCliente = CARPETA_CLIENTE
if (fs.existsSync(path.join(distCliente, 'index.html'))) {
  app.use(express.static(distCliente, {
    // sw.js e index.html nunca en caché del navegador: así las tablets reciben las actualizaciones
    setHeaders: (res, archivo) => {
      if (archivo.endsWith('sw.js') || archivo.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
    },
  }))
  // Rutas del front (/cocina, /bar, …) → index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(distCliente, 'index.html'))
  })
}

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
