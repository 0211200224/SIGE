import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()

  // Fecha o drawer sempre que a rota muda (navegação por outros meios que não
  // um clique num link do menu, ex: botão "voltar" de uma página).
  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background text-on-surface antialiased overflow-x-hidden">
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      <main className="flex-1 md:ml-64 min-h-screen min-w-0">
        <TopBar onMenuClick={() => setMenuAberto(true)} />
        <div className="pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
