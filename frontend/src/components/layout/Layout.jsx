import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background text-on-surface antialiased overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen">
        <TopBar />
        <div className="pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
