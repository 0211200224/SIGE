import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import PageHeader from '../../components/ui/PageHeader'

export default function AdminPortal() {
  const [escolas, setEscolas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/escolas').then(r => setEscolas(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const nivelIcon = { 'Ensino Primário': 'menu_book', 'Ensino Secundário': 'school', 'Técnico Profissional': 'engineering' }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Painel de Administração"
        subtitle="Gerencie todas as escolas registadas no sistema SIGE."
        action={
          <Link to="/admin/nova-escola"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Escola
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-blue-500 text-2xl mb-2">school</span>
          <p className="text-2xl font-bold text-blue-700">{loading ? '—' : escolas.length}</p>
          <p className="text-xs text-blue-600">Escolas Registadas</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-green-500 text-2xl mb-2">people</span>
          <p className="text-2xl font-bold text-green-700">
            {loading ? '—' : escolas.reduce((s, e) => s + Number(e.total_utilizadores || 0), 0)}
          </p>
          <p className="text-xs text-green-600">Total de Utilizadores</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-purple-500 text-2xl mb-2">calendar_today</span>
          <p className="text-2xl font-bold text-purple-700">{new Date().getFullYear()}</p>
          <p className="text-xs text-purple-600">Ano em Curso</p>
        </div>
      </div>

      {/* Lista de escolas */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : escolas.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">school</span>
          <h3 className="text-lg font-semibold text-on-surface mb-2">Nenhuma escola registada</h3>
          <p className="text-sm text-on-surface-variant mb-6">Comece por criar a primeira escola no sistema.</p>
          <Link to="/admin/nova-escola"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Criar Primeira Escola
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {escolas.map(escola => (
            <div key={escola.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {escola.logo
                    ? <img src={escola.logo} alt="logo" className="w-9 h-9 rounded-lg object-contain" />
                    : <span className="material-symbols-outlined text-primary text-[20px]">{nivelIcon[escola.nivel_ensino] || 'school'}</span>
                  }
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-on-surface text-sm truncate">{escola.nome}</h3>
                  <p className="text-xs text-on-surface-variant">{escola.sigla} · {escola.provincia}</p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  <span className="truncate">{escola.director_nome || 'Sem director'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>Ano lectivo: {escola.ano_lectivo || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">people</span>
                  <span>{escola.total_utilizadores || 0} utilizadores</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-outline-variant">
                <Link to={`/admin/escola/${escola.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">settings</span>
                  Gerir
                </Link>
                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg font-medium">
                  <span className="material-symbols-outlined text-[12px] mr-1">circle</span>
                  Activa
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
