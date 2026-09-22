import { create } from 'zustand'

export type ToastTipo = 'cocina' | 'bar' | 'success' | 'error' | 'info'

export interface Toast {
  id: string
  tipo: ToastTipo
  titulo: string
  mensaje: string
  duracion?: number
}

interface ToastState {
  toasts: Toast[]
  agregar: (t: Omit<Toast, 'id'>) => void
  eliminar: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  agregar: (t) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, t.duracion ?? 4000)
  },
  eliminar: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
