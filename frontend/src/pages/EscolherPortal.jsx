import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth, portaisDe, ROLE_HOME } from '../contexts/AuthContext'
import { NOME_PORTAL } from '../services/rhConstantes'

const ICONE = {
  director: 'domain', secretaria: 'desk', professor: 'school', financeiro: 'account_balance',
  rh: 'groups', pedagogico: 'menu_book',
}
const DESCRICAO = {
  director: 'Gestão geral da escola', secretaria: 'Alunos, matrículas e documentos',
  professor: 'Turmas, notas e presenças', financeiro: 'Cobranças, pagamentos e dívidas',
  rh: 'Funcionários, contratos e folha salarial', pedagogico: 'Turmas, períodos e validação de notas',
}

// Uma só conta com acesso a vários portais (ex: secretaria + RH): escolhe-se
// aqui em qual entrar, e pode-se voltar a este ecrã a qualquer momento.
export default function EscolherPortal() {
  const { user, escola, logout } = useAuth()
  const navigate = useNavigate()
  const portais = portaisDe(user)

  if (portais.length <= 1) return <Navigate to={ROLE_HOME[user?.role] || '/'} replace />

  const cor = escola?.cor_principal || '#1a2b4b'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          {escola?.logo && <img src={escola.logo} alt="" className="w-14 h-14 mx-auto mb-3 object-contain" />}
          <p className="text-sm text-on-surface-variant">{escola?.nome}</p>
          <h1 className="text-2xl font-bold text-on-surface mt-1">Olá, {user?.nome?.split(' ')[0]}</h1>
          <p className="text-sm text-on-surface-variant mt-1">Tem acesso a {portais.length} portais. Em qual quer entrar?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {portais.map(p => (
            <button key={p} onClick={() => navigate(ROLE_HOME[p] || '/')}
              className="bg-white rounded-2xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cor }}>
                <span className="material-symbols-outlined text-white text-[22px]">{ICONE[p] || 'apps'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {NOME_PORTAL[p] || p}
                  {p === user?.role && <span className="ml-2 text-[10px] font-semibold uppercase text-on-surface-variant bg-surface-bright px-1.5 py-0.5 rounded">Principal</span>}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">{DESCRICAO[p]}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="text-sm text-on-surface-variant hover:text-primary inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">logout</span>Sair
          </button>
        </div>
      </div>
    </div>
  )
}
