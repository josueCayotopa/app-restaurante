import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, ClipboardList, ChefHat, UtensilsCrossed,
  BarChart3, Settings, CalendarDays, Wallet, Package,
  Truck, Users, Beer, MoreHorizontal, X, BookOpen, LogOut,
  ChevronLeft, ChevronRight, ShoppingBag,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTemaStore } from '../../store/temaStore'
import { useSidebarStore } from '../../store/sidebarStore'
import { rutasPermitidas } from '../../lib/permisos'

const navItems = [
  { to: '/',              icon: LayoutGrid,    label: 'Mesas'       },
  { to: '/comandas',      icon: ClipboardList, label: 'Comandas'    },
  { to: '/cocina',        icon: ChefHat,       label: 'Cocina'      },
  { to: '/bar',           icon: Beer,          label: 'Bar'         },
  { to: '/pedidos',       icon: ShoppingBag,   label: 'Pedidos'     },
  { to: '/caja',          icon: Wallet,    label: 'Caja'        },
  { to: '/carta',          icon: BookOpen,        label: 'Carta'     },
  { to: '/menu',           icon: UtensilsCrossed, label: 'Productos'  },
  { to: '/reservas',      icon: CalendarDays,  label: 'Reservas'    },
  { to: '/inventario',    icon: Package,       label: 'Inventario'  },
  { to: '/proveedores',   icon: Truck,         label: 'Proveedores' },
  { to: '/usuarios',      icon: Users,         label: 'Usuarios'    },
  { to: '/reportes',      icon: BarChart3,     label: 'Reportes'    },
  { to: '/configuracion', icon: Settings,      label: 'Config.'     },
]

export default function Sidebar() {
  const [masAbierto, setMasAbierto] = useState(false)
  const { usuario, cerrarSesion } = useAuthStore()
  const { tema } = useTemaStore()
  const { colapsado, toggle } = useSidebarStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  const inicial = usuario?.nombre?.[0]?.toUpperCase() ?? 'U'

  const permitidas = rutasPermitidas(usuario?.rol)
  const itemsVisibles = navItems.filter((item) => permitidas.includes(item.to))
  const PRIMARY   = itemsVisibles.slice(0, 5)
  const SECONDARY = itemsVisibles.slice(5)

  // El sidebar sigue el tema de la app: negro (marca CADE) en modo oscuro,
  // blanco en modo claro — en vez de quedar siempre negro sin importar el tema.
  const esOscuro = tema === 'oscuro'
  const sidebarBg      = esOscuro ? 'bg-black'          : 'bg-white'
  const sidebarBorde   = esOscuro ? 'border-gray-900'    : 'border-gray-200'
  const navInactivo    = esOscuro ? 'text-gray-400 hover:bg-gray-900 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
  const nombreTexto    = esOscuro ? 'text-white'         : 'text-gray-800'
  const rolTexto       = esOscuro ? 'text-gray-500'      : 'text-gray-400'
  const logoutBtn      = esOscuro ? 'text-gray-600 hover:text-red-400 hover:bg-gray-900' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
  const mobileNavInact = esOscuro ? 'text-gray-500' : 'text-gray-400'
  const sheetCerrarBtn = esOscuro ? 'text-gray-500 hover:text-white hover:bg-gray-900' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────── */}
      <aside className={`hidden lg:flex ${colapsado ? 'w-16' : 'w-56'} ${sidebarBg} flex-col h-screen fixed left-0 top-0 z-40 border-r ${sidebarBorde} transition-all duration-200`}>

        {/* Botón colapsar/expandir */}
        <button
          onClick={toggle}
          title={colapsado ? 'Mostrar menú' : 'Ocultar menú'}
          className={`absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center shadow-md z-50 transition-colors ${sidebarBg} ${sidebarBorde} ${
            esOscuro ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {colapsado ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Logo */}
        <div className={`border-b ${sidebarBorde} flex items-center justify-center p-2 ${sidebarBg} overflow-hidden`}>
          <img
            src="/logo.jpeg"
            alt="Chicharronería CADE"
            className={`object-contain transition-all ${colapsado ? 'w-14 h-14' : 'w-full h-24'}`}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto overflow-x-hidden">
          {itemsVisibles.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={colapsado ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${colapsado ? 'justify-center px-0' : ''} ${
                  isActive
                    ? 'bg-gold-500 text-black font-bold shadow-md'
                    : navInactivo
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              {!colapsado && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={`px-3 py-3 border-t ${sidebarBorde}`}>
          <div className={`flex items-center gap-2 ${colapsado ? 'flex-col' : ''}`}>
            <div
              title={colapsado ? (usuario?.nombre ?? 'Usuario') : undefined}
              className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center text-xs font-bold text-black shrink-0"
            >
              {inicial}
            </div>
            {!colapsado && (
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${nombreTexto}`}>{usuario?.nombre ?? 'Usuario'}</p>
                <p className={`text-xs capitalize ${rolTexto}`}>{usuario?.rol ?? ''}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${logoutBtn}`}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 ${sidebarBg} border-t ${sidebarBorde}`}>
        <div className="flex h-14">
          {PRIMARY.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-gold-500' : mobileNavInact
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px] leading-tight">{label}</span>
            </NavLink>
          ))}
          {SECONDARY.length > 0 && (
            <button
              onClick={() => setMasAbierto(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                masAbierto ? 'text-gold-500' : mobileNavInact
              }`}
            >
              <MoreHorizontal size={20} />
              <span className="text-[10px] leading-tight">Más</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile "Más" sheet ────────────────────────────── */}
      {masAbierto && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/70 z-50"
            onClick={() => setMasAbierto(false)}
          />
          <div className={`lg:hidden fixed bottom-14 left-0 right-0 z-50 ${sidebarBg} rounded-t-2xl border-t ${sidebarBorde} p-4 pb-6`}>
            {/* Logo mini en el sheet */}
            <div className="flex items-center justify-between mb-4">
              <img
                src="/logo.jpeg"
                alt="Chicharronería CADE"
                className="h-10 object-contain"
              />
              <button
                onClick={() => setMasAbierto(false)}
                className={`p-1.5 rounded-lg transition-colors ${sheetCerrarBtn}`}
              >
                <X size={18} />
              </button>
            </div>
            {/* Divider dorado */}
            <div className="h-px bg-gold-500 mb-4 opacity-40" />
            <div className="grid grid-cols-4 gap-2">
              {SECONDARY.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMasAbierto(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-colors ${
                      isActive
                        ? 'bg-gold-500 text-black font-bold'
                        : navInactivo
                    }`
                  }
                >
                  <Icon size={22} />
                  <span className="text-center text-[11px] leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
