import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPOS = { '1_trimestre': '1º Trimestre', '2_trimestre': '2º Trimestre', '3_trimestre': '3º Trimestre', exame: 'Exame', recurso: 'Recurso' }
const STATUS_ICON = { aberto: { icon: 'lock_open', cls: 'text-green-600', bg: 'bg-green-50 border-green-200' }, fechado: { icon: 'lock', cls: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' } }

export default function FechoPeriodo() {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/pedagogico/periodos')
      .then(r => setPeriodos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const fechar = async (p) => {
    if (!window.confirm(`Fechar definitivamente o período "${p.nome}"?\n\nAtenção: os dados ficarão bloqueados para edição. Esta acção deve ser realizada apenas após validação completa das notas e frequência.`)) return
    setProcessando(p.id)
    try { await api.patch(`/pedagogico/periodos/${p.id}/fechar`); load() }
    catch (err) { alert(err.message) } finally { setProcessando(null) }
  }

  const reabrir = async (p) => {
    if (!window.confirm(`Reabrir o período "${p.nome}"? Os dados voltarão a ser editáveis.`)) return
    setProcessando(p.id)
    try { await api.patch(`/pedagogico/periodos/${p.id}/reabrir`); load() }
    catch (err) { alert(err.message) } finally { setProcessando(null) }
  }

  const abertos = periodos.filter(p => p.status === 'aberto')
  const fechados = periodos.filter(p => p.status === 'fechado')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Fecho de Período" subtitle="Encerramento académico e bloqueio de dados" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500 text-[22px] flex-shrink-0">warning</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Antes de fechar um período, certifique-se que:</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-700 list-disc list-inside">
              <li>Todas as notas foram lançadas e validadas pelos professores</li>
              <li>A frequência de todos os alunos foi registada</li>
              <li>Os resultados finais foram calculados</li>
              <li>O conselho de classe foi realizado (se aplicável)</li>
            </ul>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : (
        <div className="space-y-6">
          {abertos.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500 text-[18px]">lock_open</span>Períodos Abertos
              </h2>
              <div className="space-y-3">
                {abertos.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-green-600 text-[20px]">lock_open</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-on-surface">{p.nome}</h3>
                      <p className="text-xs text-on-surface-variant">{TIPOS[p.tipo]} · {p.ano_lectivo} · Nota mín. {p.nota_minima} · Freq. mín. {p.frequencia_minima}%</p>
                    </div>
                    <button onClick={() => fechar(p)} disabled={processando === p.id}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">{processando === p.id ? 'progress_activity' : 'lock'}</span>
                      {processando === p.id ? 'A fechar...' : 'Fechar Período'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fechados.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-[18px]">lock</span>Períodos Fechados
              </h2>
              <div className="space-y-3">
                {fechados.map(p => (
                  <div key={p.id} className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-600">{p.nome}</h3>
                      <p className="text-xs text-gray-400">{TIPOS[p.tipo]} · {p.ano_lectivo} · Fechado</p>
                    </div>
                    <button onClick={() => reabrir(p)} disabled={processando === p.id}
                      className="flex items-center gap-2 text-xs text-on-surface-variant border border-outline-variant hover:bg-surface-bright px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors">
                      <span className="material-symbols-outlined text-[15px]">lock_open</span>Reabrir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {periodos.length === 0 && (
            <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">lock_clock</span>
              <p className="text-sm text-on-surface-variant">Nenhum período lectivo criado. Crie períodos na secção de Períodos Lectivos.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
