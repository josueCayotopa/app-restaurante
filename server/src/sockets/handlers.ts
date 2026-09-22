import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function registrarHandlers(io: Server, socket: Socket): void {
  console.log(`[WS] Cliente conectado: ${socket.id}`)

  // ── Mesas ────────────────────────────────────────────────────────────
  socket.on('mesa:cambiar_estado', async (data: { mesaId: string; estado: string }) => {
    try {
      const mesa = await prisma.mesa.update({
        where: { id: data.mesaId },
        data: { estado: data.estado as never },
      })
      io.emit('mesa:estado_actualizado', mesa)
    } catch {
      socket.emit('error', { mensaje: 'No se pudo actualizar la mesa' })
    }
  })

  // ── Comandas ─────────────────────────────────────────────────────────
  socket.on('comanda:nueva', async (data: { comandaId: string }) => {
    try {
      const comanda = await prisma.comanda.findUnique({
        where: { id: data.comandaId },
        include: { items: true },
      })
      if (comanda) io.emit('comanda:recibida', comanda)
    } catch {
      socket.emit('error', { mensaje: 'No se pudo emitir la comanda' })
    }
  })

  socket.on(
    'comanda:actualizar_item',
    async (data: { comandaId: string; itemId: string; estado: string }) => {
      try {
        const item = await prisma.itemComanda.update({
          where: { id: data.itemId },
          data: { estado: data.estado as never },
        })
        io.emit('comanda:item_actualizado', { comandaId: data.comandaId, item })
      } catch {
        socket.emit('error', { mensaje: 'No se pudo actualizar el ítem' })
      }
    }
  )

  socket.on('comanda:cambiar_estado', async (data: { comandaId: string; estado: string }) => {
    try {
      const comanda = await prisma.comanda.update({
        where: { id: data.comandaId },
        data: { estado: data.estado as never },
        include: { items: true },
      })
      io.emit('comanda:estado_actualizado', comanda)
    } catch {
      socket.emit('error', { mensaje: 'No se pudo actualizar la comanda' })
    }
  })

  // ── KDS (cocina / bar) ───────────────────────────────────────────────
  socket.on('kds:unirse', (area: 'cocina' | 'bar') => {
    socket.join(`kds:${area}`)
    console.log(`[WS] KDS ${area} unido: ${socket.id}`)
  })

  // ── Devolución de ítem ───────────────────────────────────────────────
  socket.on(
    'comanda:devolver_item',
    async (data: { comandaId: string; itemId: string; area: 'cocina' | 'bar'; nombre: string; numeroMesa: number }) => {
      try {
        await prisma.itemComanda.update({
          where: { id: data.itemId },
          data: { estado: 'devuelto' },
        })
        io.to(`kds:${data.area}`).emit('comanda:item_devuelto', {
          comandaId: data.comandaId,
          itemId: data.itemId,
          area: data.area,
          nombre: data.nombre,
          numeroMesa: data.numeroMesa,
        })
      } catch {
        socket.emit('error', { mensaje: 'No se pudo registrar la devolución' })
      }
    }
  )

  // ── Items agregados a comanda existente ──────────────────────────────
  socket.on('comanda:items_agregados', async (data: { comandaId: string }) => {
    try {
      const comanda = await prisma.comanda.findUnique({
        where: { id: data.comandaId },
        include: { items: true },
      })
      if (comanda) {
        io.to('kds:cocina').emit('comanda:actualizada', comanda)
        io.to('kds:bar').emit('comanda:actualizada', comanda)
      }
    } catch {
      socket.emit('error', { mensaje: 'No se pudo emitir la actualización' })
    }
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Cliente desconectado: ${socket.id}`)
  })
}

// Función para emitir a un área KDS específica desde rutas REST
export function emitirAKDS(io: Server, area: 'cocina' | 'bar', evento: string, data: unknown): void {
  io.to(`kds:${area}`).emit(evento, data)
}
