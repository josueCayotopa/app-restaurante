// Qué vistas puede ver cada rol. El admin ve todo; el resto solo su(s) módulo(s).
export const RUTAS_POR_ROL: Record<string, string[]> = {
  admin: [
    '/', '/comandas', '/pedidos', '/cocina', '/bar', '/agotados', '/caja', '/carta', '/menu',
    '/reservas', '/inventario', '/proveedores', '/usuarios', '/reportes', '/configuracion',
  ],
  mozo: ['/', '/comandas', '/pedidos', '/reservas', '/carta', '/configuracion'],
  // Cocina y Bar: su pantalla y marcar lo que se terminó por hoy (sin crear ni editar productos)
  cocinero: ['/cocina', '/agotados', '/configuracion'],
  bartender: ['/bar', '/agotados', '/configuracion'],
  // Caja también ve el estado de las mesas y gestiona productos y carta
  cajero: ['/caja', '/pedidos', '/', '/menu', '/carta', '/agotados', '/configuracion'],
}

export function rutasPermitidas(rol: string | undefined): string[] {
  return RUTAS_POR_ROL[rol ?? ''] ?? ['/configuracion']
}

export function tieneAcceso(rol: string | undefined, path: string): boolean {
  return rutasPermitidas(rol).includes(path)
}

export function rutaInicial(rol: string | undefined): string {
  return rutasPermitidas(rol)[0] ?? '/configuracion'
}
