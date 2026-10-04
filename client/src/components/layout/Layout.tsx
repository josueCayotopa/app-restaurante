import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ToastContainer from '../ui/ToastContainer'
import AvisoConexion from './AvisoConexion'
import { useSidebarStore } from '../../store/sidebarStore'

export default function Layout() {
  const colapsado = useSidebarStore((s) => s.colapsado)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--fondo)' }}>
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-[margin] duration-200 ${colapsado ? 'lg:ml-16' : 'lg:ml-56'}`}>
        <AvisoConexion />
        <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
