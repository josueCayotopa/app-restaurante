import type { Server } from 'socket.io'

let ioInstance: Server | undefined

export function setIo(io: Server): void {
  ioInstance = io
}

export function getIo(): Server {
  if (!ioInstance) throw new Error('Socket.io no ha sido inicializado')
  return ioInstance
}
