import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, portaisDe } from '../contexts/AuthContext'

export default function PrivateRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Entra se algum dos portais da conta (principal ou adicional) for permitido.
  if (allowedRoles && !allowedRoles.some(r => portaisDe(user).includes(r))) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}
