// Beep de dos tonos generado con Web Audio API — sin necesidad de archivo de audio.
export function reproducirAlerta(): void {
  try {
    type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext }
    const w = window as AudioWindow
    const AudioCtx = w.AudioContext ?? w.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const tonos = [880, 660]
    tonos.forEach((freq, i) => {
      const inicio = ctx.currentTime + i * 0.16
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, inicio)
      gain.gain.setValueAtTime(0.18, inicio)
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.3)
      osc.start(inicio)
      osc.stop(inicio + 0.3)
    })
    setTimeout(() => ctx.close(), 700)
  } catch {
    // Audio no disponible (autoplay bloqueado, navegador sin soporte, etc.) — se ignora.
  }
}
