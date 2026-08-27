import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ConfirmContext = createContext(null)

// Substitui window.confirm() pelo mesmo diálogo estilizado em toda a app,
// em vez de cada página desenhar o seu próprio popup (como acontecia antes,
// ex: Admin/GerirEscola.jsx). Uso: const confirmar = useConfirm();
// const ok = await confirmar({ title, body, danger }); if (!ok) return
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { title, body, danger, confirmLabel }
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState(typeof options === 'string' ? { body: options } : options)
    })
  }, [])

  const handle = (result) => {
    setState(null)
    if (resolverRef.current) { resolverRef.current(result); resolverRef.current = null }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${state.danger ? 'bg-red-100' : 'bg-amber-100'}`}>
                <span className={`material-symbols-outlined ${state.danger ? 'text-red-600' : 'text-amber-600'}`}>
                  {state.danger ? 'delete_forever' : 'warning'}
                </span>
              </div>
              <h3 className="font-semibold text-on-surface">{state.title || 'Confirmar acção'}</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed whitespace-pre-line">{state.body}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handle(false)}
                className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright transition-colors">
                Cancelar
              </button>
              <button onClick={() => handle(true)}
                className={`px-4 py-2 text-sm rounded-xl font-semibold text-white transition-colors ${state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {state.confirmLabel || (state.danger ? 'Eliminar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx
}
