// Modelo de ticket independiente de la impresora. Se convierte a ESC/POS (impresoras de red)
// o a HTML (impresoras conectadas a un equipo, en el navegador). Así cada ticket se diseña una vez.

export type Alineacion = 'izq' | 'centro' | 'der'
// 1 = normal · 'alto' = doble alto · 2 = doble alto y ancho (títulos, número de mesa)
export type Tamano = 1 | 'alto' | 2

export type Linea =
  | { t: 'logo' }
  | { t: 'texto'; texto: string; alinear?: Alineacion; negrita?: boolean; tam?: Tamano; invertido?: boolean; recuadro?: boolean }
  | { t: 'fila'; izq: string; der: string; negrita?: boolean; tam?: Tamano }
  | { t: 'separador'; doble?: boolean }
  | { t: 'espacio' }

export interface Documento {
  titulo: string          // para el historial de impresiones
  lineas: Linea[]
  abrirGaveta?: boolean   // pulso a la gaveta de dinero (solo impresoras de red)
}

export const texto = (t: string, o: Omit<Extract<Linea, { t: 'texto' }>, 't' | 'texto'> = {}): Linea => ({ t: 'texto', texto: t, ...o })
export const fila = (izq: string, der: string, o: { negrita?: boolean; tam?: Tamano } = {}): Linea => ({ t: 'fila', izq, der, ...o })
export const separador = (doble = false): Linea => ({ t: 'separador', doble })
export const espacio: Linea = { t: 'espacio' }
