// Qué vistas puede ver cada rol. El admin ve todo; el resto solo su(s) módulo(s).
export const RUTAS_POR_ROL: Record<string, string[]> = {
  admin: [
    '/', '/comandas', '/cocina', '/bar', '/caja', '/carta', '/menu',
    '/reservas', '/inventario', '/proveedores', '/usuarios', '/reportes', '/configuracion',
  ],
  mozo: ['/', '/comandas', '/reservas', '/carta', '/configuracion'],
  cocinero: ['/cocina', '/configuracion'],
  bartender: ['/bar', '/configuracion'],
  cajero: ['/caja', '/configuracion'],
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
