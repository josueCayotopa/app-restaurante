// "Agotado hoy": el producto vuelve solo al día siguiente (fecha de Lima, igual que el servidor)
export const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
export const estaAgotado = (p: { agotadoDia?: string | null }) => !!p.agotadoDia && p.agotadoDia === hoyLima()
