// Por defecto el servidor está en la misma máquina que sirve la app, puerto 3001.
// Así una tablet que abre http://192.168.1.50:5173 habla con http://192.168.1.50:3001.
export const BASE = import.meta.env.VITE_API_URL ?? `${location.protocol}//${location.hostname}:3001`

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
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
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`)
  return data as T
}

// true si falló la red (WiFi caído, servidor inalcanzable) y no la API en sí
export function esErrorDeRed(e: unknown): boolean {
  if (e instanceof ApiError) return false
  return e instanceof TypeError || (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError'))
}
