import { io } from 'socket.io-client'

// Mismo criterio que lib/api.ts: el servidor está en la misma máquina, puerto 3001
const URL = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3001`

export const socket = io(URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  // Reintenta sin límite: en zonas con WiFi intermitente la conexión va y viene
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})
