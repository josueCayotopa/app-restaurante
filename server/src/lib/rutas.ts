import fs from 'fs'
import path from 'path'

// Carpeta raíz del servidor (la que tiene package.json). En desarrollo el código corre desde
// server/src y compilado desde server/dist/src, así que no se puede usar un "../.." fijo.
function buscarRaiz(desde: string): string {
  let dir = desde
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const padre = path.dirname(dir)
    if (padre === dir) return path.resolve(desde, '..')   // no debería pasar
    dir = padre
  }
  return dir
}

export const RAIZ_SERVIDOR = buscarRaiz(__dirname)
export const CARPETA_UPLOADS = path.join(RAIZ_SERVIDOR, 'uploads')               // fotos de productos
export const CARPETA_CLIENTE = path.join(RAIZ_SERVIDOR, '..', 'client', 'dist')  // app web compilada
