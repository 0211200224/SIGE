import { useState, useEffect, useRef } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const corNota = (v) => {
  if (v === null || v === undefined) return 'text-gray-400'
  const n = Number(v)
  if (n >= 14) return 'text-green-600 font-bold'
  if (n >= 10) return 'text-blue-600'
  return 'text-red-600 font-bold'
}

const bgMedia = (v) => {
  if (v === null || v === undefined) return 'bg-gray-100 text-gray-500'
  const n = Number(v)
  if (n >= 14) return 'bg-green-100 text-green-800 font-bold'
  if (n >= 10) return 'bg-blue-100 text-blue-800'
  return 'bg-red-100 text-red-800 font-bold'
}

export default function EstudanteBoletim() {
  const [boletim, setBoletim] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef(null)

  useEffect(() => {
    api.get('/estudante/boletim')
      .then(r => setBoletim(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  if (!boletim) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader title="Boletim" subtitle="Resumo académico para impressão" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">Não foi possível carregar o boletim.</p>
        </div>
      </div>
    )
  }

  const { perfil, disciplinas } = boletim
  const mediaFinal = (() => {
    const vals = disciplinas.map(d => d.mediaFinal).filter(v => v !== null)
    if (!vals.length) return null
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10
  })()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Boletim"
        subtitle="Resumo académico com notas e médias"
        action={
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all print:hidden">
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimir / Baixar
          </button>
        }
      />

      {/* Boletim para imprimir */}
      <div ref={printRef} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">

        {/* Cabeçalho */}
        <div className="bg-teal-700 text-white p-6 print:bg-teal-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{perfil?.escola_nome || 'Escola'}</h1>
              <p className="text-teal-200 text-sm">{perfil?.nivel_ensino || ''}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-teal-100">Ano Lectivo</p>
              <p className="text-2xl font-bold">{perfil?.ano_lectivo || '—'}</p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-teal-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-teal-300 text-xs uppercase tracking-wide">Aluno</p>
              <p className="font-semibold text-sm mt-0.5">{perfil?.nome}</p>
            </div>
            <div>
              <p className="text-teal-300 text-xs uppercase tracking-wide">Nº Matrícula</p>
              <p className="font-semibold text-sm mt-0.5">{perfil?.numero_matricula || '—'}</p>
            </div>
            <div>
              <p className="text-teal-300 text-xs uppercase tracking-wide">Classe</p>
              <p className="font-semibold text-sm mt-0.5">{perfil?.classe ? `${perfil.classe}ª Classe` : '—'}</p>
            </div>
            <div>
              <p className="text-teal-300 text-xs uppercase tracking-wide">Turma</p>
              <p className="font-semibold text-sm mt-0.5">{perfil?.turma_nome || '—'}</p>
            </div>
          </div>
        </div>

        {/* Tabela de notas */}
        {disciplinas.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-3">grade</span>
            <p className="text-sm">Ainda não existem notas publicadas.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-outline-variant">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant">Disciplina</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-on-surface-variant">1º Trim.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-on-surface-variant">2º Trim.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-on-surface-variant">3º Trim.</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-on-surface-variant">Média Final</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-on-surface-variant">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplinas.map((d, i) => (
                    <tr key={d.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-5 py-3 font-medium text-on-surface">{d.nome}</td>
                      {[1, 2, 3].map(t => (
                        <td key={t} className={`px-3 py-3 text-center ${corNota(d.mediasTrimestrais?.[t])}`}>
                          {d.mediasTrimestrais?.[t] ?? <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-3 py-0.5 rounded-full text-sm ${bgMedia(d.mediaFinal)}`}>
                          {d.mediaFinal ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.mediaFinal !== null ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.mediaFinal >= 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {d.mediaFinal >= 10 ? 'Aprovado' : 'Reprovado'}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé com média geral */}
            <div className="px-5 py-4 bg-gray-50 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-on-surface">Média Geral:</span>
                <span className={`text-lg px-3 py-0.5 rounded-full ${bgMedia(mediaFinal)}`}>
                  {mediaFinal ?? '—'}
                </span>
              </div>
              <div className="text-right text-xs text-on-surface-variant">
                <p>Emitido em: {new Date().toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="mt-0.5 italic">Escala: 0 a 20 valores</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nota sobre impressão */}
      <p className="text-xs text-on-surface-variant mt-4 text-center print:hidden">
        Clica em "Imprimir / Baixar" para guardar o boletim em PDF ou imprimir directamente.
      </p>
    </div>
  )
}
