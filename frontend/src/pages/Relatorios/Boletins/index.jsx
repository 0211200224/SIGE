import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

export default function RelatorioBoletins() {
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [filtros, setFiltros] = useState({ turma_id: '', aluno_id: '' })
  const [boletim, setBoletim] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/pedagogico/turmas').then(r => setTurmas(r.data?.data || r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!filtros.turma_id) { setAlunos([]); return }
    api.get(`/secretaria/alunos?turma_id=${filtros.turma_id}`)
      .then(r => setAlunos(r.data?.data || r.data || []))
      .catch(() => setAlunos([]))
  }, [filtros.turma_id])

  const gerarBoletim = async () => {
    if (!filtros.aluno_id) return
    setLoading(true)
    try {
      const [notasR, presencasR, alunoR] = await Promise.all([
        api.get(`/notas?aluno_id=${filtros.aluno_id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/presencas?aluno_id=${filtros.aluno_id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/secretaria/alunos/${filtros.aluno_id}`).catch(() => ({ data: null })),
      ])
      const turma = turmas.find(t => String(t.id) === String(filtros.turma_id))
      const aluno = alunoR.data || alunos.find(a => String(a.id) === String(filtros.aluno_id))

      // Agrupar notas por disciplina e trimestre
      const notas = notasR.data?.data || notasR.data || []
      const disciplinasMap = {}
      notas.forEach(n => {
        const disc = n.disciplina_nome || n.disciplina || `Disciplina ${n.disciplina_id}`
        if (!disciplinasMap[disc]) disciplinasMap[disc] = {}
        disciplinasMap[disc][n.trimestre] = n.valor
      })

      // Frequência
      const pres = presencasR.data?.data || presencasR.data || []
      const totalAulas = pres.length
      const totalPresencas = pres.filter(p => p.presente).length
      const taxaFreq = totalAulas > 0 ? Math.round(totalPresencas * 100 / totalAulas) : null

      setBoletim({ aluno, turma, disciplinas: disciplinasMap, totalAulas, totalPresencas, taxaFreq })
    } catch {}
    setLoading(false)
  }

  const media3 = (d) => {
    const vals = [1,2,3].map(t => d[t]).filter(v => v !== undefined && v !== null)
    return vals.length > 0 ? (vals.reduce((s, v) => s + parseFloat(v), 0) / vals.length).toFixed(1) : '—'
  }

  const calcMedia = (d) => {
    const m = media3(d)
    return m === '—' ? null : parseFloat(m)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Boletins Escolares" subtitle="Gerar boletim individual por aluno" />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Turma</label>
          <select value={filtros.turma_id} onChange={e => setFiltros(p => ({ ...p, turma_id: e.target.value, aluno_id: '' }))}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-44">
            <option value="">Seleccionar turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Aluno <span className="text-red-500">*</span></label>
          <select value={filtros.aluno_id} onChange={e => setFiltros(p => ({ ...p, aluno_id: e.target.value }))}
            disabled={!filtros.turma_id}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-52 disabled:opacity-50">
            <option value="">Seleccionar aluno</option>
            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <button onClick={gerarBoletim} disabled={!filtros.aluno_id || loading}
          className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">description</span>
          {loading ? 'A gerar...' : 'Gerar Boletim'}
        </button>
        {boletim && (
          <button onClick={() => window.print()}
            className="ml-auto flex items-center gap-2 bg-surface-variant text-on-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-outline-variant transition-colors">
            <span className="material-symbols-outlined text-[16px]">print</span>
            Imprimir
          </button>
        )}
      </div>

      {!boletim && !loading && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] text-outline-variant block mb-3">description</span>
          <p className="text-sm">Seleccione uma turma e um aluno para gerar o boletim</p>
        </div>
      )}

      {loading && <div className="text-center py-12 text-sm text-on-surface-variant">A gerar boletim...</div>}

      {boletim && !loading && (
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-primary px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/70 uppercase tracking-widest mb-1">Boletim Escolar</p>
                <h2 className="text-xl font-bold">{boletim.aluno?.nome}</h2>
                <p className="text-sm text-white/80 mt-1">
                  Turma: {boletim.turma?.nome || '—'}
                  {boletim.aluno?.numero_matricula && ` · Nº ${boletim.aluno.numero_matricula}`}
                </p>
              </div>
              <div className="text-right text-sm text-white/70">
                <p>Ano Lectivo {boletim.turma?.ano_lectivo || new Date().getFullYear()}</p>
                <p className="mt-1">{new Date().toLocaleDateString('pt-MZ')}</p>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="p-6">
            <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600 text-[18px]">grade</span>
              Avaliações por Disciplina
            </h3>

            {Object.keys(boletim.disciplinas).length === 0 ? (
              <div className="py-6 text-center text-sm text-on-surface-variant bg-surface-variant/30 rounded-xl">
                Sem notas registadas para este aluno
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-sm">
                  <thead className="bg-surface-variant text-on-surface-variant">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Disciplina</th>
                      <th className="text-center px-4 py-2 font-medium">1.º Trim.</th>
                      <th className="text-center px-4 py-2 font-medium">2.º Trim.</th>
                      <th className="text-center px-4 py-2 font-medium">3.º Trim.</th>
                      <th className="text-center px-4 py-2 font-medium">Média</th>
                      <th className="text-center px-4 py-2 font-medium">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {Object.entries(boletim.disciplinas).map(([disc, notas]) => {
                      const m = calcMedia(notas)
                      const aprovado = m !== null && m >= 10
                      return (
                        <tr key={disc} className="hover:bg-surface-variant/20">
                          <td className="px-4 py-3 font-medium text-on-surface">{disc}</td>
                          {[1,2,3].map(t => {
                            const val = notas[t]
                            const ok = val !== undefined && parseFloat(val) >= 10
                            return (
                              <td key={t} className={`px-4 py-3 text-center font-semibold ${val === undefined ? 'text-on-surface-variant' : ok ? 'text-green-700' : 'text-red-700'}`}>
                                {val ?? '—'}
                              </td>
                            )
                          })}
                          <td className={`px-4 py-3 text-center font-bold text-base ${m === null ? 'text-on-surface-variant' : aprovado ? 'text-green-700' : 'text-red-700'}`}>
                            {m === null ? '—' : m}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {m !== null && (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${aprovado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {aprovado ? 'Aprovado' : 'Reprovado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Frequência */}
            {boletim.taxaFreq !== null && (
              <div className="mt-5 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h3 className="font-semibold text-sm text-blue-800 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  Frequência Escolar
                </h3>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-blue-600 font-bold text-xl">{boletim.taxaFreq}%</span>
                    <p className="text-xs text-blue-700/70">taxa de frequência</p>
                  </div>
                  <div className="text-blue-700/80">
                    <p>{boletim.totalPresencas} presenças de {boletim.totalAulas} aulas</p>
                    <p className="font-medium mt-0.5">
                      {boletim.taxaFreq >= 75 ? 'Frequência satisfatória' : 'Frequência insuficiente — risco de reprovação'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé de assinaturas */}
            <div className="mt-8 grid grid-cols-3 gap-8 pt-6 border-t border-outline-variant text-center text-xs text-on-surface-variant">
              {['Director(a)', 'Director(a) de Turma', 'Encarregado(a)'].map(label => (
                <div key={label}>
                  <div className="border-b border-on-surface-variant/40 mb-2 pb-8" />
                  <p>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-3 border-t border-outline-variant bg-surface-variant/30 text-xs text-on-surface-variant flex justify-between">
            <span>Gerado em: {new Date().toLocaleString('pt-MZ')}</span>
            <span>SIGE — Sistema Integrado de Gestão Escolar</span>
          </div>
        </div>
      )}
    </div>
  )
}
