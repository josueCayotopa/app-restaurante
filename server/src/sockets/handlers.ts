import { Server, Socket } from 'socket.io'

// Eventos que escucha el servidor por WebSocket.
// Todo cambio de datos (mesas, comandas, ítems) va por la API REST, que exige sesión y rol;
// por aquí solo se reciben avisos que no escriben en la base de datos.
// (Antes había handlers que modificaban mesas/comandas sin autenticación: se quitaron.)
export function registrarHandlers(_io: Server, socket: Socket): void {
  console.log(`[WS] Cliente conectado: ${socket.id}`)

  // ── KDS (cocina / bar) ───────────────────────────────────────────────
  socket.on('kds:unirse', (area: 'cocina' | 'bar') => {
    if (area !== 'cocina' && area !== 'bar') return
    socket.join(`kds:${area}`)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Cliente desconectado: ${socket.id}`)
  })
}
