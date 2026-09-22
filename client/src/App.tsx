import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import MesasPage from './pages/mesas/MesasPage'
import ComandasPage from './pages/comandas/ComandasPage'
import CocinaPage from './pages/cocina/CocinaPage'
import BarPage from './pages/bar/BarPage'
import MenuPage from './pages/menu/MenuPage'
import CartaPublicaPage from './pages/carta/CartaPublicaPage'
import ReservasPage from './pages/reservas/ReservasPage'
import CajaPage from './pages/caja/CajaPage'
import InventarioPage from './pages/inventario/InventarioPage'
import ReportesPage from './pages/reportes/ReportesPage'
import ProveedoresPage from './pages/proveedores/ProveedoresPage'
import UsuariosPage from './pages/usuarios/UsuariosPage'
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage'
import LoginPage from './pages/login/LoginPage'
import { useAuthStore } from './store/authStore'
import { useComandasStore } from './store/comandasStore'
import { useTurnoStore } from './store/turnoStore'
import { useMesasStore } from './store/mesasStore'
import { useCartaStore } from './store/cartaStore'
import { useSocketSync } from './hooks/useSocketSync'
import { tieneAcceso, rutaInicial } from './lib/permisos'

function Proximamente({ nombre }: { nombre: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
      <div className="text-5xl">🚧</div>
      <p className="text-lg font-semibold">{nombre}</p>
      <p className="text-sm">Próximamente disponible</p>
    </div>
  )
}

function RutaProtegida() {
  const { usuario, token, verificarToken } = useAuthStore()
  const cargarComandas = useComandasStore((s) => s.cargarComandas)
  const cargarTurno    = useTurnoStore((s) => s.cargarTurno)
  const cargarMesas    = useMesasStore((s) => s.cargarMesas)
  const cargarProductos = useCartaStore((s) => s.cargarProductos)
  const [verificado, setVerificado] = useState(false)

  useSocketSync()

  useEffect(() => {
    const init = async () => {
      if (token) {
        await verificarToken()
      }
      setVerificado(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (usuario) {
      cargarComandas()
      cargarTurno()
      cargarMesas()
      cargarProductos()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  if (!verificado) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />
  return <RutaConPermiso rol={usuario.rol} />
}

// Redirige si el rol del usuario no tiene acceso a la vista actual (ej. un
// cocinero intentando entrar a /usuarios escribiendo la URL a mano).
function RutaConPermiso({ rol }: { rol: string }) {
  const location = useLocation()
  if (!tieneAcceso(rol, location.pathname)) {
    return <Navigate to={rutaInicial(rol)} replace />
  }
  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RutaProtegida />}>
          <Route index element={<MesasPage />} />
          <Route path="comandas" element={<ComandasPage />} />
          <Route path="cocina" element={<CocinaPage />} />
          <Route path="bar" element={<BarPage />} />
          <Route path="caja" element={<CajaPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="carta" element={<CartaPublicaPage />} />
          <Route path="reservas" element={<ReservasPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
