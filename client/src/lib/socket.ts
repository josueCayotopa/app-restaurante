import { io } from 'socket.io-client'

// Mismo criterio que lib/api.ts: mismo origen que la app (VITE_SERVER_URL solo si está en otra máquina)
const URL = import.meta.env.VITE_SERVER_URL || undefined

export const socket = io(URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  // Reintenta sin límite: en zonas con WiFi intermitente la conexión va y viene
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})
