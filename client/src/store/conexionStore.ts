import { create } from 'zustand'
import { socket } from '../lib/socket'

// Estado de la conexión con el servidor (no solo "hay WiFi": que el servidor responda).
// Lo usa el aviso de conexión y la cola de pedidos pendientes.
interface ConexionState {
  conectado: boolean
  setConectado: (v: boolean) => void
}

export const useConexionStore = create<ConexionState>((set) => ({
  conectado: socket.connected,
  setConectado: (conectado) => set({ conectado }),
}))

socket.on('connect', () => useConexionStore.getState().setConectado(true))
socket.on('disconnect', () => useConexionStore.getState().setConectado(false))
