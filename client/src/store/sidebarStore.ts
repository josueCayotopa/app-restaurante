import { create } from 'zustand'

interface SidebarState {
  colapsado: boolean
  toggle: () => void
}

const KEY = 'sgr-sidebar-colapsado'

function leerInicial(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const useSidebarStore = create<SidebarState>((set) => ({
  colapsado: leerInicial(),
  toggle: () =>
    set((s) => {
      const nuevo = !s.colapsado
      try { localStorage.setItem(KEY, nuevo ? '1' : '0') } catch { /* noop */ }
      return { colapsado: nuevo }
    }),
}))
