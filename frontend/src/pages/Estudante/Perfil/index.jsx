import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const Row = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-outline-variant last:border-b-0">
    <span className="text-xs font-medium text-on-surface-variant w-40 flex-shrink-0 mb-0.5 sm:mb-0">{label}</span>
    <span className="text-sm text-on-surface font-medium">{value || '—'}</span>
  </div>
)

export default function EstudantePerfil() {
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/estudante/perfil')
      .then(r => setPerfil(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Dados Pessoais" subtitle="Informações da sua matrícula" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
          <p className="text-red-700 font-medium">Não foi possível carregar os dados do perfil.</p>
        </div>
      </div>
    )
  }

  const generoLabel = { M: 'Masculino', F: 'Feminino' }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Dados Pessoais" subtitle="Informações da sua matrícula e turma" />

      {/* Avatar + nome */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6 flex items-center gap-5">
        <div className="w-20 h-24 rounded-xl overflow-hidden bg-teal-100 flex items-center justify-center flex-shrink-0 border border-outline-variant">
          {perfil.foto
            ? <img src={perfil.foto} alt={perfil.nome} className="w-full h-full object-cover" />
            : <span className="text-2xl font-bold text-teal-700">
                {perfil.nome?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </span>
          }
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">{perfil.nome}</h2>
          <p className="text-sm text-on-surface-variant">{perfil.numero_matricula || 'Sem nº matrícula'}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
            <span className="material-symbols-outlined text-[14px]">school</span>
            {perfil.escola_sigla || perfil.escola_nome || 'Escola'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Dados pessoais */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-500 text-[18px]">person</span>
            Dados Pessoais
          </h3>
          <Row label="Nome Completo" value={perfil.nome} />
          <Row label="Data de Nascimento" value={perfil.data_nascimento ? new Date(perfil.data_nascimento).toLocaleDateString('pt-MZ') : null} />
          <Row label="Género" value={generoLabel[perfil.genero]} />
          <Row label="Nº Matrícula" value={perfil.numero_matricula} />
        </div>

        {/* Dados académicos */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-[18px]">class</span>
            Dados Académicos
          </h3>
          <Row label="Escola" value={perfil.escola_nome} />
          <Row label="Nível de Ensino" value={perfil.nivel_ensino} />
          <Row label="Classe" value={perfil.classe ? `${perfil.classe}ª Classe` : null} />
          <Row label="Turma" value={perfil.turma_nome} />
          <Row label="Ano Lectivo" value={perfil.ano_lectivo} />
        </div>
      </div>
    </div>
  )
}
