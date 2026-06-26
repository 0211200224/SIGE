import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const selCls = "rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"

const corNota = (v) => {
  if (v === null || v === undefined) return 'text-gray-400'
  return Number(v) >= 14 ? 'text-green-600 font-bold' : Number(v) >= 10 ? 'text-blue-600' : 'text-red-600 font-bold'
}

const handlePrint = (pauta) => {
  const { info, trimestre, alunos } = pauta
  const tipos = [...new Set(alunos.flatMap(a => Object.keys(a.notas || {})))]
  const janela = window.open('', '_blank')
  const rows = alunos.map((a, i) => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px 10px;font-size:13px">${i + 1}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;font-size:13px">${a.nome}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;font-size:11px;color:#555">${a.numero_matricula}</td>
      ${tipos.map(t => `<td style="border:1px solid #ccc;padding:6px 10px;text-align:center;font-size:13px">${a.notas[t] ?? '—'}</td>`).join('')}
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center;font-size:13px;font-weight:bold;color:${a.media >= 10 ? '#16a34a' : '#dc2626'}">${a.media ?? '—'}</td>
    </tr>`).join('')

  janela.document.write(`<!DOCTYPE html><html><head><title>Pauta</title>
<style>body{font-family:Arial,sans-serif;padding:30px}h1{font-size:18px;margin:0}p{margin:4px 0;font-size:13px;color:#555}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f3f4f6;border:1px solid #ccc;padding:8px 10px;font-size:12px;text-align:left}.footer{margin-top:30px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}@media print{button{display:none}}</style>
</head><body>
<h1>Pauta de Avaliação</h1>
<p>${info?.disciplina_nome || ''} · ${info?.turma_nome || ''} · ${info?.classe_nome || ''}</p>
<p>${trimestre}º Trimestre</p>
<table>
<tr><th>#</th><th>Nome</th><th>Nº Matrícula</th>${tipos.map(t => `<th style="text-align:center">${t}</th>`).join('')}<th style="text-align:center">Média</th></tr>
${rows}
</table>
<div class="footer">SIGECADA · ${new Date().toLocaleDateString('pt-MZ')}</div>
</body></html>`)
  janela.document.close()
  janela.focus()
  setTimeout(() => { janela.print(); janela.close() }, 300)
}

export default function ProfessorPautas() {
  const [searchParams] = useSearchParams()
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPauta, setLoadingPauta] = useState(false)
  const [pauta, setPauta] = useState(null)

  const [turmaId, setTurmaId] = useState(searchParams.get('turma_id') || '')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [trimestre, setTrimestre] = useState('1')
  const [disciplinas, setDisciplinas] = useState([])

  useEffect(() => {
    api.get('/professor/minhas-turmas').then(r => {
      const por_turma = {}
      for (const a of (r.data || [])) {
        if (!por_turma[a.turma_id]) por_turma[a.turma_id] = { turma_id: a.turma_id, turma_nome: a.turma_nome, classe_nome: a.classe_nome, disciplinas: [] }
        por_turma[a.turma_id].disciplinas.push({ id: a.disciplina_id, nome: a.disciplina_nome })
      }
      setTurmas(Object.values(por_turma))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = turmas.find(t => t.turma_id == turmaId)
    setDisciplinas(t?.disciplinas || [])
    setDisciplinaId(t?.disciplinas[0]?.id || '')
    setPauta(null)
  }, [turmaId, turmas])

  const gerar = async () => {
    if (!turmaId || !disciplinaId) return
    setLoadingPauta(true)
    setPauta(null)
    try {
      const r = await api.get(`/professor/pauta?turma_id=${turmaId}&disciplina_id=${disciplinaId}&trimestre=${trimestre}`)
      setPauta({ ...r.data, trimestre })
    } catch (err) { alert(err.message) }
    finally { setLoadingPauta(false) }
  }

  const tipos = pauta ? [...new Set(pauta.alunos.flatMap(a => Object.keys(a.notas || {})))] : []
  const aprovados = pauta ? pauta.alunos.filter(a => a.media !== null && a.media >= 10).length : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Pautas" subtitle="Ver e imprimir pautas de avaliação por turma e trimestre" />

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Turma *</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className={`${selCls} w-full`}>
              <option value="">Seleccionar turma</option>
              {turmas.map(t => <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} · {t.classe_nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Disciplina *</label>
            <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} className={`${selCls} w-full`}>
              <option value="">Seleccionar disciplina</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Trimestre</label>
            <select value={trimestre} onChange={e => { setTrimestre(e.target.value); setPauta(null) }} className={`${selCls} w-full`}>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
            </select>
          </div>
          <button onClick={gerar} disabled={!turmaId || !disciplinaId || loadingPauta}
            className="flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all">
            {loadingPauta ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : <span className="material-symbols-outlined text-[16px]">table_view</span>}
            Gerar Pauta
          </button>
        </div>
      </div>

      {!pauta && !loadingPauta && (
        <EmptyState icon="print" title="Configure e gere a pauta" description="Seleccione a turma, disciplina e trimestre, e clique em Gerar Pauta." />
      )}

      {pauta && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-on-surface">{pauta.info?.disciplina_nome} · {pauta.info?.turma_nome}</p>
              <p className="text-sm text-on-surface-variant">{pauta.info?.classe_nome} · {pauta.trimestre}º Trimestre · {pauta.alunos.length} alunos</p>
            </div>
            <div className="flex items-center gap-4">
              {pauta.alunos.some(a => a.media !== null) && (
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">Aprovados</p>
                  <p className="text-sm font-bold text-green-600">{aprovados}/{pauta.alunos.length}</p>
                </div>
              )}
              <button onClick={() => handlePrint(pauta)}
                className="flex items-center gap-2 border border-outline-variant text-on-surface px-4 py-2 rounded-lg text-sm hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[16px]">print</span>Imprimir
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Aluno</th>
                    {tipos.map(t => <th key={t} className="px-3 py-3 text-xs font-medium text-on-surface-variant text-center min-w-20">{t}</th>)}
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant text-center">Média</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {pauta.alunos.map((a, i) => (
                    <tr key={a.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/40'}`}>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{a.nome}</p>
                        <p className="text-xs text-on-surface-variant">{a.numero_matricula}</p>
                      </td>
                      {tipos.map(t => (
                        <td key={t} className={`px-3 py-3 text-center text-sm ${corNota(a.notas[t])}`}>
                          {a.notas[t] ?? <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className={`px-4 py-3 text-center text-sm ${corNota(a.media)}`}>
                        {a.media ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.media !== null ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.media >= 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {a.media >= 10 ? 'Aprovado' : 'Reprovado'}
                          </span>
                        ) : <span className="text-xs text-gray-400">Sem notas</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
