import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
    return id
  }, [])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (msg, duration) => add(msg, 'success', duration),
    error: (msg, duration) => add(msg, 'error', duration || 5000),
    warning: (msg, duration) => add(msg, 'warning', duration),
    info: (msg, duration) => add(msg, 'info', duration),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.toast
}

const STYLES = {
  success: { bg: 'bg-green-600', icon: 'check_circle', bar: 'bg-green-400' },
  error:   { bg: 'bg-red-600',   icon: 'error',         bar: 'bg-red-400' },
  warning: { bg: 'bg-amber-500', icon: 'warning',       bar: 'bg-amber-300' },
  info:    { bg: 'bg-blue-600',  icon: 'info',          bar: 'bg-blue-400' },
}

function ToastItem({ toast, onRemove }) {
  const s = STYLES[toast.type] || STYLES.info
  return (
    <div className={`${s.bg} text-white rounded-xl shadow-xl flex items-start gap-3 px-4 py-3 min-w-72 max-w-sm pointer-events-auto animate-slide-in`}>
      <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">{s.icon}</span>
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-white/70 hover:text-white transition-colors flex-shrink-0">
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
