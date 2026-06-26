import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

export default function RelatorioPautas() {
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [filtros, setFiltros] = useState({ turma_id: '', disciplina_id: '', trimestre: '1' })
  const [pauta, setPauta] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/turmas').then(r => r.data?.data || r.data || []).catch(() => []),
      api.get('/pedagogico/disciplinas').then(r => r.data?.data || r.data || []).catch(() => []),
    ]).then(([t, d]) => { setTurmas(t); setDisciplinas(d) })
  }, [])

  const gerarPauta = async () => {
    if (!filtros.turma_id) return
    setLoading(true)
    try {
      const p = new URLSearchParams(filtros)
      // Obter alunos e notas da turma
      const [alunosR, notasR] = await Promise.all([
        api.get(`/secretaria/alunos?turma_id=${filtros.turma_id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/notas?turma_id=${filtros.turma_id}&trimestre=${filtros.trimestre}${filtros.disciplina_id ? `&disciplina_id=${filtros.disciplina_id}` : ''}`).catch(() => ({ data: { data: [] } })),
      ])
      const turma = turmas.find(t => String(t.id) === String(filtros.turma_id))
      const disc = filtros.disciplina_id ? disciplinas.find(d => String(d.id) === String(filtros.disciplina_id)) : null
      const relData = await api.get(`/relatorios/academico?turma_id=${filtros.turma_id}&trimestre=${filtros.trimestre}`).then(r => r.data?.data || r.data || []).catch(() => [])
      setPauta({
        turma,
        disciplina: disc,
        trimestre: filtros.trimestre,
        alunos: alunosR.data?.data || alunosR.data || [],
        notas: notasR.data?.data || notasR.data || [],
        mediasDisciplinas: relData,
      })
    } catch {}
    setLoading(false)
  }

  const getNotaAluno = (alunoId, disciplinaId) => {
    const n = pauta?.notas?.find(n =>
      String(n.aluno_id) === String(alunoId) &&
      (!disciplinaId || String(n.disciplina_id) === String(disciplinaId))
    )
    return n?.valor ?? '—'
  }

  // Disciplinas únicas nas notas
  const disciplinasNasPauta = pauta
    ? [...new Map(pauta.notas.map(n => [n.disciplina_id, { id: n.disciplina_id, nome: n.disciplina_nome || n.disciplina }])).values()]
    : []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Pautas de Avaliação" subtitle="Gerar e imprimir pautas por turma e disciplina" />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Turma <span className="text-red-500">*</span></label>
          <select value={filtros.turma_id} onChange={e => setFiltros(p => ({ ...p, turma_id: e.target.value }))}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-44">
            <option value="">Seleccionar turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Disciplina</label>
          <select value={filtros.disciplina_id} onChange={e => setFiltros(p => ({ ...p, disciplina_id: e.target.value }))}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-44">
            <option value="">Todas as disciplinas</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Trimestre</label>
          <select value={filtros.trimestre} onChange={e => setFiltros(p => ({ ...p, trimestre: e.target.value }))}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="1">1.º Trimestre</option>
            <option value="2">2.º Trimestre</option>
            <option value="3">3.º Trimestre</option>
          </select>
        </div>
        <button onClick={gerarPauta} disabled={!filtros.turma_id || loading}
          className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">table_chart</span>
          {loading ? 'A gerar...' : 'Gerar Pauta'}
        </button>
        {pauta && (
          <button onClick={() => window.print()}
            className="ml-auto flex items-center gap-2 bg-surface-variant text-on-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-outline-variant transition-colors">
            <span className="material-symbols-outlined text-[16px]">print</span>
            Imprimir
          </button>
        )}
      </div>

      {/* Pauta */}
      {!pauta && !loading && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] text-outline-variant block mb-3">table_chart</span>
          <p className="text-sm">Seleccione uma turma e clique em "Gerar Pauta"</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-sm text-on-surface-variant">A gerar pauta...</div>
      )}

      {pauta && !loading && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          {/* Cabeçalho da pauta */}
          <div className="px-6 py-5 border-b border-outline-variant bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-on-surface">PAUTA DE AVALIAÇÃO</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Turma: <strong>{pauta.turma?.nome}</strong>
                  {pauta.disciplina && <> · Disciplina: <strong>{pauta.disciplina.nome}</strong></>}
                  {' '} · <strong>{pauta.trimestre}.º Trimestre</strong>
                </p>
              </div>
              <div className="text-right text-xs text-on-surface-variant">
                <p>Data: {new Date().toLocaleDateString('pt-MZ')}</p>
                <p className="font-medium">{pauta.alunos.length} aluno(s)</p>
              </div>
            </div>
          </div>

          {pauta.alunos.length === 0 ? (
            <div className="p-8 text-center text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px] text-outline-variant block mb-2">groups</span>
              Sem alunos nesta turma
            </div>
          ) : disciplinasNasPauta.length === 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-variant text-on-surface-variant">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium w-10">Nº</th>
                    <th className="text-left px-4 py-3 font-medium">Nome do Aluno</th>
                    <th className="text-left px-4 py-3 font-medium">Nº Matrícula</th>
                    <th className="text-center px-4 py-3 font-medium">Nota</th>
                    <th className="text-center px-4 py-3 font-medium">Resultado</th>
                    <th className="px-4 py-3 font-medium">Assinatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {pauta.alunos.map((a, i) => {
                    const nota = getNotaAluno(a.id)
                    const aprovado = nota !== '—' && parseFloat(nota) >= 10
                    return (
                      <tr key={a.id} className="hover:bg-surface-variant/20">
                        <td className="px-4 py-3 text-on-surface-variant text-center">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-on-surface">{a.nome}</td>
                        <td className="px-4 py-3 text-on-surface-variant text-xs">{a.numero_matricula || '—'}</td>
                        <td className={`px-4 py-3 text-center font-bold text-base ${nota !== '—' && parseFloat(nota) >= 10 ? 'text-green-700' : nota !== '—' ? 'text-red-700' : 'text-on-surface-variant'}`}>
                          {nota}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {nota !== '—' && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${aprovado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {aprovado ? 'Aprovado' : 'Reprovado'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-outline-variant/40 print:border-on-surface-variant/30">&nbsp;</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Multi-disciplina */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-variant text-on-surface-variant">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium w-8">Nº</th>
                    <th className="text-left px-3 py-3 font-medium">Aluno</th>
                    {disciplinasNasPauta.map(d => (
                      <th key={d.id} className="text-center px-2 py-3 font-medium text-xs max-w-20">{d.nome}</th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {pauta.alunos.map((a, i) => {
                    const notasAluno = disciplinasNasPauta.map(d => {
                      const n = pauta.notas.find(n => String(n.aluno_id) === String(a.id) && String(n.disciplina_id) === String(d.id))
                      return n?.valor ?? null
                    })
                    const comNota = notasAluno.filter(n => n !== null)
                    const media = comNota.length > 0 ? comNota.reduce((s, n) => s + parseFloat(n), 0) / comNota.length : null
                    const aprovado = media !== null && media >= 10
                    return (
                      <tr key={a.id} className="hover:bg-surface-variant/20">
                        <td className="px-3 py-3 text-center text-on-surface-variant text-xs">{i + 1}</td>
                        <td className="px-3 py-3 font-medium text-on-surface text-xs">{a.nome}</td>
                        {notasAluno.map((nota, j) => (
                          <td key={j} className={`px-2 py-3 text-center font-bold text-sm ${nota !== null && parseFloat(nota) >= 10 ? 'text-green-700' : nota !== null ? 'text-red-700' : 'text-on-surface-variant'}`}>
                            {nota ?? '—'}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          {media !== null && (
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

          {/* Rodapé */}
          <div className="px-6 py-4 border-t border-outline-variant bg-surface-variant/30 text-xs text-on-surface-variant flex justify-between">
            <span>Gerado em: {new Date().toLocaleString('pt-MZ')}</span>
            <span>SIGE — Sistema Integrado de Gestão Escolar</span>
          </div>
        </div>
      )}
    </div>
  )
}
