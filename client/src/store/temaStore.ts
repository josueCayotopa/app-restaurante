import { create } from 'zustand'

export type Tema = 'claro' | 'oscuro'

interface TemaState {
  tema: Tema
  setTema: (tema: Tema) => void
}

// v2: la identidad de marca CADE (negro + dorado) ahora es el tema por defecto.
// Se usa una clave nueva para que una preferencia "claro" guardada antes de
// este cambio no se quede pegada silenciosamente.
const TEMA_KEY = 'sgr-tema-v2'

function aplicarTema(tema: Tema) {
  document.documentElement.setAttribute('data-tema', tema)
  try { localStorage.setItem(TEMA_KEY, tema) } catch { /* noop */ }
}

const temaInicial: Tema = (() => {
  try {
    const g = localStorage.getItem(TEMA_KEY)
    if (g === 'claro' || g === 'oscuro') return g
  } catch { /* noop */ }
  return 'oscuro'
})()

// Aplica antes del primer render para evitar flash
aplicarTema(temaInicial)

export const useTemaStore = create<TemaState>((set) => ({
  tema: temaInicial,
  setTema: (tema) => {
    aplicarTema(tema)
    set({ tema })
  },
}))
