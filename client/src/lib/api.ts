// La API está en el MISMO origen desde el que se abrió la app:
//  · en desarrollo, Vite reenvía /api, /uploads y /socket.io al puerto 3001 (vite.config.ts);
//  · en producción, Node (npm start) o IIS sirven app y API en la misma dirección.
// Así funciona igual en la PC, en las tablets y detrás de IIS con HTTPS.
export const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// Sesión: el servidor manda un token nuevo cuando el actual está por vencer (se guarda solo), y
// si llega un 401 con sesión iniciada se avisa a la app para llevar al login (antes los cambios
// de una pantalla con la sesión vencida se perdían sin aviso).
// Fecha de vencimiento (ms) de un token JWT; 0 si no se puede leer
function vencimiento(token: string): number {
  try {
    const datos = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof datos.exp === 'number' ? datos.exp * 1000 : 0
  } catch { return 0 }
}

// Solo cuenta si la petición salió con la sesión ACTUAL: la respuesta tardía de una petición
// hecha con una sesión anterior (ya vencida) no debe cerrar la sesión que se acaba de iniciar
// ni pisar su token.
function revisarSesion(res: Response, tokenUsado: string | null) {
  if (!tokenUsado || localStorage.getItem('sgr_token') !== tokenUsado) return
  // Solo se acepta si dura MÁS que el actual: una respuesta guardada en la caché del navegador
  // (304) puede traer un token renovado de hace horas, ya vencido, y no debe reemplazar al vigente
  const nuevo = res.headers.get('X-Token-Renovado')
  if (nuevo && vencimiento(nuevo) > Math.max(vencimiento(tokenUsado), Date.now())) {
    try { localStorage.setItem('sgr_token', nuevo) } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new CustomEvent('sgr:token-renovado', { detail: nuevo }))
  }
  if (res.status === 401) window.dispatchEvent(new CustomEvent('sgr:sesion-vencida'))
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sgr_token')
  const res = await fetch(`${BASE}${path}`, {
    // Con WiFi débil una petición puede quedar colgada: se corta a los 15 s y se trata como sin red
    signal: AbortSignal.timeout(15000),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  revisarSesion(res, token)
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`)
  return data as T
}

// URL absoluta de un recurso servido por el backend (ej. producto.imagen = "/uploads/xxx.jpg")
export function urlArchivo(rutaRelativa: string): string {
  return `${BASE}${rutaRelativa}`
}

export async function apiUpload<T>(path: string, file: File, campo = 'imagen'): Promise<T> {
  const token = localStorage.getItem('sgr_token')
  const formData = new FormData()
  formData.append(campo, file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  revisarSesion(res, token)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`)
  return data as T
}

// true si falló la red (WiFi caído, servidor inalcanzable) y no la API en sí
// Fallas que vale la pena reintentar más tarde: sin red, o el servidor/base de datos caídos
// (5xx, p. ej. 503 "sin base de datos" o 502/504 del proxy IIS), tiempo agotado o demasiadas peticiones
export function esReintentable(e: unknown): boolean {
  // 401: sesión vencida → el cambio queda guardado en este equipo y sale al volver a iniciar sesión
  if (e instanceof ApiError) return e.status >= 500 || e.status === 401 || e.status === 408 || e.status === 429
  return esErrorDeRed(e)
}

export function esErrorDeRed(e: unknown): boolean {
  if (e instanceof ApiError) return false
  return e instanceof TypeError || (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError'))
}
