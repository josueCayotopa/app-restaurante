import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import Header from '../../components/layout/Header'
import {
  useCartaPublicaStore,
  type ItemCarta,
  type SeccionCarta,
} from '../../store/cartaPublicaStore'

// ── Configuración por sección ───────────────────────────────────────────────
export const SECCION_CFG: Record<SeccionCarta, {
  label: string
  p1: string
  p2: string | null
  p3: string | null
}> = {
  plato:               { label: 'Plato de la Casa',    p1: 'Personal', p2: 'Fuente',  p3: null     },
  chaufa:              { label: 'Chaufa',              p1: 'Personal', p2: 'Mixto',   p3: 'Fuente' },
  caldo:               { label: 'Caldo',               p1: 'Precio',   p2: null,       p3: null     },
  guarnicion:          { label: 'Guarnición',          p1: 'Chico',    p2: 'Grande',  p3: null     },
  guarnicion_extra:    { label: 'Guarnición Extra',    p1: 'Precio',   p2: null,       p3: null     },
  bebida_caliente:     { label: 'Bebida Caliente',     p1: 'Precio',   p2: null,       p3: null     },
  bebida_fria_jarra:   { label: 'Bebida Fría (Jarra)', p1: 'Precio',   p2: null,       p3: null     },
  bebida_fria_gaseosa: { label: 'Gaseosa / Bebida',   p1: 'Precio',   p2: null,       p3: null     },
}

const SECCIONES_NAV = [
  { id: 'promos',       label: '% Promos'    },
  { id: 'platos',       label: 'Platos'      },
  { id: 'chaufas',      label: 'Chaufas'     },
  { id: 'caldos',       label: 'Caldos'      },
  { id: 'guarniciones', label: 'Guarniciones'},
  { id: 'bebidas',      label: 'Bebidas'     },
]

const PROMOS = [
  { emoji: '👮', titulo: 'PNP',        descuento: '10%', condicion: 'Todos los días',   requisito: 'Estar de servicio o portar placa',                          colorBorder: 'border-steel-500', colorBadge: 'bg-steel-600 text-white',  colorBg: 'bg-steel-50'  },
  { emoji: '🎓', titulo: 'Clases 2026',descuento: '10%', condicion: 'Lunes a viernes',  requisito: 'Profesores: carné docente · Alumnos: uniforme puesto',       colorBorder: 'border-gold-400',  colorBadge: 'bg-gold-500 text-black',   colorBg: 'bg-gold-50'   },
  { emoji: '🎂', titulo: 'Cumpleañero',descuento: '50%', condicion: 'Solo para ti',     requisito: 'Presentar DNI en físico',                                    colorBorder: 'border-rojo-500',  colorBadge: 'bg-rojo-600 text-white',   colorBg: 'bg-rojo-50'   },
]

// ── Modal agregar / editar ──────────────────────────────────────────────────

type FormData = { seccion: SeccionCarta; nombre: string; p1: string; p2: string; p3: string }

const FORM_EMPTY: FormData = { seccion: 'plato', nombre: '', p1: '', p2: '', p3: '' }

function toForm(item: ItemCarta): FormData {
  return { seccion: item.seccion, nombre: item.nombre, p1: item.p1, p2: item.p2, p3: item.p3 }
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && ' *'}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
      />
    </div>
  )
}

function ModalItemCarta({
  item,
  seccionDefault,
  onGuardar,
  onCerrar,
}: {
  item?: ItemCarta
  seccionDefault: SeccionCarta
  onGuardar: (datos: Omit<ItemCarta, 'id'>) => void
  onCerrar: () => void
}) {
  const [form, setForm] = useState<FormData>(
    item ? toForm(item) : { ...FORM_EMPTY, seccion: seccionDefault }
  )

  const cfg = SECCION_CFG[form.seccion]
  const set = (k: keyof FormData) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSeccion = (s: SeccionCarta) => {
    setForm({ seccion: s, nombre: form.nombre, p1: '', p2: '', p3: '' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar({ seccion: form.seccion, nombre: form.nombre, p1: form.p1, p2: form.p2, p3: form.p3 })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">
            {item ? 'Editar ítem' : 'Agregar a la carta'}
          </h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Sección */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sección *</label>
            <select
              value={form.seccion}
              onChange={(e) => handleSeccion(e.target.value as SeccionCarta)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            >
              {(Object.keys(SECCION_CFG) as SeccionCarta[]).map((s) => (
                <option key={s} value={s}>{SECCION_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <CampoTexto label="Nombre" value={form.nombre} onChange={set('nombre')} required />

          {/* Precios — dinámicos según sección */}
          <div className={`grid gap-3 ${cfg.p3 ? 'grid-cols-3' : cfg.p2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <CampoTexto
              label={cfg.p1}
              value={form.p1}
              onChange={set('p1')}
              placeholder="ej. S/ 15.00"
              required
            />
            {cfg.p2 && (
              <CampoTexto
                label={cfg.p2}
                value={form.p2}
                onChange={set('p2')}
                placeholder="ej. S/ 35.00 ó —"
              />
            )}
            {cfg.p3 && (
              <CampoTexto
                label={cfg.p3}
                value={form.p3}
                onChange={set('p3')}
                placeholder="ej. S/ 25.00"
              />
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={15} />
              {item ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sub-componentes de display ──────────────────────────────────────────────

function SeccionHeader({
  titulo,
  emoji,
  onAgregar,
}: {
  titulo: string
  emoji: string
  onAgregar: () => void
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">{emoji}</span>
      <h2 className="text-sm font-black tracking-widest text-black uppercase shrink-0">{titulo}</h2>
      <div className="flex-1 h-px bg-gold-400" />
      <button
        onClick={onAgregar}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-gold-50 border border-gold-300 text-gold-700 rounded-lg text-xs font-semibold hover:bg-gold-100 transition-colors"
      >
        <Plus size={12} />
        Agregar
      </button>
    </div>
  )
}

function AccionesItem({ onEditar, onEliminar }: { onEditar: () => void; onEliminar: () => void }) {
  return (
    <div className="flex gap-0.5 ml-1 shrink-0">
      <button
        onClick={onEditar}
        className="p-1.5 text-gold-500 hover:bg-gold-50 rounded-lg transition-colors"
        title="Editar"
      >
        <Edit2 size={13} />
      </button>
      <button
        onClick={onEliminar}
        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
        title="Eliminar"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function EncabezadoTabla({ cols }: { cols: string[] }) {
  return (
    <div className="flex items-center px-3 pt-1 pb-0.5 mb-0.5">
      <span className="flex-1" />
      {cols.map((c) => (
        <span key={c} className="w-24 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">
          {c}
        </span>
      ))}
      <span className="w-16" />
    </div>
  )
}

function FilaTabla({
  item, col1, col2, col3, zebra, onEditar, onEliminar,
}: {
  item: ItemCarta
  col1: string
  col2?: string
  col3?: string
  zebra: boolean
  onEditar: () => void
  onEliminar: () => void
}) {
  return (
    <div className={`flex items-center px-3 py-2 text-sm ${zebra ? 'bg-gray-50' : 'bg-white'}`}>
      <span className="flex-1 text-gray-800 min-w-0 pr-2">{item.nombre}</span>
      <span className="w-24 text-right font-semibold text-gold-700 shrink-0">{col1}</span>
      {col2 !== undefined && (
        <span className="w-24 text-right font-semibold text-gold-700 shrink-0">{col2}</span>
      )}
      {col3 !== undefined && (
        <span className="w-24 text-right font-semibold text-gold-700 shrink-0">{col3}</span>
      )}
      <AccionesItem onEditar={onEditar} onEliminar={onEliminar} />
    </div>
  )
}

function ItemSimple({
  item, zebra, onEditar, onEliminar,
}: {
  item: ItemCarta
  zebra: boolean
  onEditar: () => void
  onEliminar: () => void
}) {
  return (
    <div className={`flex items-center px-3 py-2 text-sm ${zebra ? 'bg-gray-50' : 'bg-white'}`}>
      <span className="flex-1 text-gray-800 min-w-0 pr-2">{item.nombre}</span>
      <span className="font-semibold text-gold-700 shrink-0">{item.p1}</span>
      <AccionesItem onEditar={onEditar} onEliminar={onEliminar} />
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

type ModalState =
  | { abierto: false }
  | { abierto: true; item?: ItemCarta; seccionDefault: SeccionCarta }

export default function CartaPublicaPage() {
  const { items, agregar, actualizar, eliminar, deSeccion } = useCartaPublicaStore()
  const [navActiva, setNavActiva]   = useState<string | null>(null)
  const [modal, setModal]           = useState<ModalState>({ abierto: false })

  const scrollTo = (id: string) => {
    setNavActiva(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const abrirAgregar = (seccion: SeccionCarta) =>
    setModal({ abierto: true, seccionDefault: seccion })

  const abrirEditar = (item: ItemCarta) =>
    setModal({ abierto: true, item, seccionDefault: item.seccion })

  const handleGuardar = (datos: Omit<ItemCarta, 'id'>) => {
    if (modal.abierto && modal.item) {
      actualizar(modal.item.id, datos)
    } else {
      agregar(datos)
    }
    setModal({ abierto: false })
  }

  const platos    = deSeccion('plato')
  const chaufas   = deSeccion('chaufa')
  const caldos    = deSeccion('caldo')
  const guarns    = deSeccion('guarnicion')
  const guarExts  = deSeccion('guarnicion_extra')
  const bebidasC  = deSeccion('bebida_caliente')
  const bebidasJ  = deSeccion('bebida_fria_jarra')
  const bebidasG  = deSeccion('bebida_fria_gaseosa')

  const totalItems = items.length

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Carta" subtitulo={`${totalItems} ítems en la carta`} />

      {/* Nav de secciones */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex gap-1 px-4 py-2 overflow-x-auto">
          {SECCIONES_NAV.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                navActiva === s.id
                  ? 'bg-gold-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gold-100 hover:text-gold-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-24">

        {/* ── PROMOCIONES ────────────────────────────── */}
        <section id="promos">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏷️</span>
            <h2 className="text-sm font-black tracking-widest text-black uppercase">Promociones</h2>
            <div className="flex-1 h-px bg-gold-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROMOS.map((p) => (
              <div
                key={p.titulo}
                className={`rounded-2xl border-2 ${p.colorBorder} ${p.colorBg} p-4 flex flex-col gap-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{p.emoji}</span>
                  <span className={`text-2xl font-black px-3 py-0.5 rounded-full ${p.colorBadge}`}>
                    {p.descuento} dcto.
                  </span>
                </div>
                <p className="font-black text-gray-900 text-base">{p.titulo}</p>
                <p className="text-xs font-semibold text-gray-500">{p.condicion}</p>
                <div className="border-t border-current border-opacity-20 pt-2">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Requisito: </span>{p.requisito}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PLATOS DE LA CASA ──────────────────────── */}
        <section id="platos">
          <SeccionHeader titulo="Platos de la Casa" emoji="🍽️" onAgregar={() => abrirAgregar('plato')} />
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <EncabezadoTabla cols={['Personal', 'Fuente']} />
            {platos.map((item, i) => (
              <FilaTabla
                key={item.id}
                item={item}
                col1={item.p1}
                col2={item.p2}
                zebra={i % 2 === 1}
                onEditar={() => abrirEditar(item)}
                onEliminar={() => eliminar(item.id)}
              />
            ))}
            {platos.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin platos</p>}
          </div>
        </section>

        {/* ── CHAUFAS ────────────────────────────────── */}
        <section id="chaufas">
          <SeccionHeader titulo="Chaufas" emoji="🍳" onAgregar={() => abrirAgregar('chaufa')} />
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <EncabezadoTabla cols={['Personal', 'Mixto', 'Fuente']} />
            {chaufas.map((item, i) => (
              <FilaTabla
                key={item.id}
                item={item}
                col1={item.p1}
                col2={item.p2}
                col3={item.p3}
                zebra={i % 2 === 1}
                onEditar={() => abrirEditar(item)}
                onEliminar={() => eliminar(item.id)}
              />
            ))}
            {chaufas.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin chaufas</p>}
          </div>
        </section>

        {/* ── CALDOS ─────────────────────────────────── */}
        <section id="caldos">
          <SeccionHeader titulo="Caldos" emoji="🥣" onAgregar={() => abrirAgregar('caldo')} />
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {caldos.map((item, i) => (
              <ItemSimple
                key={item.id}
                item={item}
                zebra={i % 2 === 1}
                onEditar={() => abrirEditar(item)}
                onEliminar={() => eliminar(item.id)}
              />
            ))}
            {caldos.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin caldos</p>}
          </div>
        </section>

        {/* ── GUARNICIONES ───────────────────────────── */}
        <section id="guarniciones">
          <SeccionHeader titulo="Guarniciones" emoji="🌽" onAgregar={() => abrirAgregar('guarnicion')} />
          <p className="text-xs text-gray-400 mb-2 px-1">Precio chico / grande</p>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <EncabezadoTabla cols={['Chico', 'Grande']} />
            {guarns.map((item, i) => (
              <FilaTabla
                key={item.id}
                item={item}
                col1={item.p1}
                col2={item.p2}
                zebra={i % 2 === 1}
                onEditar={() => abrirEditar(item)}
                onEliminar={() => eliminar(item.id)}
              />
            ))}
            {guarns.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin guarniciones</p>}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Extras</h3>
              <div className="flex-1 h-px bg-gray-200" />
              <button
                onClick={() => abrirAgregar('guarnicion_extra')}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-gold-700 border border-gold-300 bg-gold-50 rounded-lg font-semibold hover:bg-gold-100"
              >
                <Plus size={11} />
                Agregar
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {guarExts.map((item, i) => (
                <ItemSimple
                  key={item.id}
                  item={item}
                  zebra={i % 2 === 1}
                  onEditar={() => abrirEditar(item)}
                  onEliminar={() => eliminar(item.id)}
                />
              ))}
              {guarExts.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin extras</p>}
            </div>
          </div>
        </section>

        {/* ── BEBIDAS ────────────────────────────────── */}
        <section id="bebidas">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🥤</span>
            <h2 className="text-sm font-black tracking-widest text-black uppercase shrink-0">Bebidas</h2>
            <div className="flex-1 h-px bg-gold-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Calientes */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">☕ Calientes</h3>
                <div className="flex-1 h-px bg-gray-200" />
                <button
                  onClick={() => abrirAgregar('bebida_caliente')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs text-gold-700 border border-gold-300 bg-gold-50 rounded-lg font-semibold hover:bg-gold-100"
                >
                  <Plus size={11} /> Agregar
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {bebidasC.map((item, i) => (
                  <ItemSimple key={item.id} item={item} zebra={i % 2 === 1}
                    onEditar={() => abrirEditar(item)} onEliminar={() => eliminar(item.id)} />
                ))}
                {bebidasC.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin bebidas</p>}
              </div>
            </div>

            {/* Jarras */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">🫙 Jarras (1 Lt)</h3>
                <div className="flex-1 h-px bg-gray-200" />
                <button
                  onClick={() => abrirAgregar('bebida_fria_jarra')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs text-gold-700 border border-gold-300 bg-gold-50 rounded-lg font-semibold hover:bg-gold-100"
                >
                  <Plus size={11} /> Agregar
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {bebidasJ.map((item, i) => (
                  <ItemSimple key={item.id} item={item} zebra={i % 2 === 1}
                    onEditar={() => abrirEditar(item)} onEliminar={() => eliminar(item.id)} />
                ))}
                {bebidasJ.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin bebidas</p>}
              </div>
            </div>
          </div>

          {/* Gaseosas */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">🧃 Gaseosas y otros</h3>
              <div className="flex-1 h-px bg-gray-200" />
              <button
                onClick={() => abrirAgregar('bebida_fria_gaseosa')}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-gold-700 border border-gold-300 bg-gold-50 rounded-lg font-semibold hover:bg-gold-100"
              >
                <Plus size={11} /> Agregar
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {bebidasG.map((item, i) => (
                <ItemSimple key={item.id} item={item} zebra={i % 2 === 1}
                  onEditar={() => abrirEditar(item)} onEliminar={() => eliminar(item.id)} />
              ))}
              {bebidasG.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Sin bebidas</p>}
            </div>
          </div>
        </section>

      </div>

      {/* FAB global */}
      <button
        onClick={() => setModal({ abierto: true, seccionDefault: 'plato' })}
        className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-30 w-12 h-12 bg-gold-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gold-700 transition-colors"
        title="Agregar ítem a la carta"
      >
        <Plus size={22} />
      </button>

      {/* Modal */}
      {modal.abierto && (
        <ModalItemCarta
          item={modal.item}
          seccionDefault={modal.seccionDefault}
          onGuardar={handleGuardar}
          onCerrar={() => setModal({ abierto: false })}
        />
      )}
    </div>
  )
}
