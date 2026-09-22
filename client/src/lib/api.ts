export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sgr_token')
  const res = await fetch(`${BASE}${path}`, {
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
