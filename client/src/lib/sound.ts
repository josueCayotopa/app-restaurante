// Alertas sonoras generadas con Web Audio API (sin archivos de audio).
// Tono, volumen y repeticiones se eligen en Configuración → Sonido y se guardan en ESTE equipo.

export type TonoAlerta = 'alarma' | 'campana' | 'timbre' | 'sirena' | 'clasico'

export interface ConfigSonido {
  activo: boolean
  tono: TonoAlerta
  volumen: number       // 0 – 100
  repeticiones: number  // 1 – 3
}

export const TONOS: { valor: TonoAlerta; label: string; desc: string }[] = [
  { valor: 'alarma',  label: 'Alarma',        desc: 'Pitido fuerte e insistente (el más notorio)' },
  { valor: 'campana', label: 'Campana',       desc: 'Tres campanadas claras' },
  { valor: 'timbre',  label: 'Timbre cocina', desc: 'Timbre de mostrador rápido' },
  { valor: 'sirena',  label: 'Sirena',        desc: 'Sube y baja, se oye entre el ruido' },
  { valor: 'clasico', label: 'Clásico',       desc: 'El sonido suave de antes' },
]

const CLAVE = 'sgr_sonido'
const POR_DEFECTO: ConfigSonido = { activo: true, tono: 'alarma', volumen: 90, repeticiones: 2 }

export function leerConfigSonido(): ConfigSonido {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<ConfigSonido> | null
    return { ...POR_DEFECTO, ...(guardada ?? {}) }
  } catch {
    return POR_DEFECTO
  }
}
export function guardarConfigSonido(c: ConfigSonido) {
  try { localStorage.setItem(CLAVE, JSON.stringify(c)) } catch { /* sin almacenamiento */ }
}

// ── Contexto de audio compartido ──────────────────────────────────────────────
// Los navegadores no dejan sonar hasta que alguien toca la pantalla: el primer toque
// "desbloquea" el audio y desde ahí las alertas suenan solas (KDS sin nadie al lado).

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext }
let ctx: AudioContext | null = null
function contexto(): AudioContext | null {
  if (ctx) return ctx
  const w = window as AudioWindow
  const AudioCtx = w.AudioContext ?? w.webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  return ctx
}
if (typeof window !== 'undefined') {
  const desbloquear = () => { contexto()?.resume().catch(() => {}) }
  window.addEventListener('pointerdown', desbloquear)
  window.addEventListener('keydown', desbloquear)
}

// ── Tonos ─────────────────────────────────────────────────────────────────────

type Nota = { f: number; fFin?: number; ini: number; dur: number; onda: OscillatorType; nivel: number; caida?: boolean }

// Cada tono es una secuencia de notas (inicio y duración en segundos)
function notasDe(tono: TonoAlerta): { notas: Nota[]; largo: number } {
  switch (tono) {
    case 'alarma': {
      const notas: Nota[] = []
      for (let i = 0; i < 6; i++) notas.push({ f: i % 2 ? 740 : 988, ini: i * 0.13, dur: 0.11, onda: 'square', nivel: 0.5 })
      return { notas, largo: 0.85 }
    }
    case 'campana': {
      const notas: Nota[] = []
      for (let i = 0; i < 3; i++) {
        const ini = i * 0.32
        notas.push({ f: 1318, ini, dur: 0.6, onda: 'sine', nivel: 1, caida: true })
        notas.push({ f: 2636, ini, dur: 0.35, onda: 'sine', nivel: 0.35, caida: true })   // armónico: brillo de campana
      }
      return { notas, largo: 1.3 }
    }
    case 'timbre': {
      const notas: Nota[] = []
      for (let i = 0; i < 4; i++) notas.push({ f: 1568, ini: i * 0.12, dur: 0.25, onda: 'triangle', nivel: 1, caida: true })
      return { notas, largo: 0.75 }
    }
    case 'sirena':
      return {
        notas: [
          { f: 600, fFin: 1300, ini: 0, dur: 0.45, onda: 'sawtooth', nivel: 0.4 },
          { f: 1300, fFin: 600, ini: 0.45, dur: 0.45, onda: 'sawtooth', nivel: 0.4 },
        ],
        largo: 1,
      }
    case 'clasico':
    default:
      return {
        notas: [
          { f: 880, ini: 0, dur: 0.3, onda: 'sine', nivel: 1, caida: true },
          { f: 660, ini: 0.16, dur: 0.3, onda: 'sine', nivel: 1, caida: true },
        ],
        largo: 0.5,
      }
  }
}

function sonar(c: AudioContext, tono: TonoAlerta, volumen: number, repeticiones: number) {
  // Compresor: permite subir el volumen sin que el sonido se distorsione
  const compresor = c.createDynamicsCompressor()
  compresor.threshold.value = -12
  compresor.ratio.value = 6
  compresor.connect(c.destination)
  const maestro = c.createGain()
  maestro.gain.value = Math.max(0, Math.min(100, volumen)) / 100
  maestro.connect(compresor)

  const { notas, largo } = notasDe(tono)
  const base = c.currentTime + 0.02
  for (let r = 0; r < Math.max(1, Math.min(3, repeticiones)); r++) {
    const t0 = base + r * (largo + 0.25)
    for (const n of notas) {
      const ini = t0 + n.ini
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = n.onda
      osc.frequency.setValueAtTime(n.f, ini)
      if (n.fFin) osc.frequency.linearRampToValueAtTime(n.fFin, ini + n.dur)
      g.gain.setValueAtTime(0.0001, ini)
      g.gain.exponentialRampToValueAtTime(n.nivel, ini + 0.01)
      if (n.caida) g.gain.exponentialRampToValueAtTime(0.0001, ini + n.dur)
      else { g.gain.setValueAtTime(n.nivel, ini + n.dur - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ini + n.dur) }
      osc.connect(g); g.connect(maestro)
      osc.start(ini); osc.stop(ini + n.dur + 0.02)
    }
  }
}

// Suena la alerta con la configuración de este equipo (o la que se pase, para "Probar")
export function reproducirAlerta(config: ConfigSonido = leerConfigSonido(), forzar = false): void {
  try {
    if (!config.activo && !forzar) return
    const c = contexto()
    if (!c) return
    if (c.state === 'suspended') c.resume().then(() => sonar(c, config.tono, config.volumen, config.repeticiones)).catch(() => {})
    else sonar(c, config.tono, config.volumen, config.repeticiones)
  } catch {
    // Audio no disponible (autoplay bloqueado, navegador sin soporte, etc.) — se ignora.
  }
}
