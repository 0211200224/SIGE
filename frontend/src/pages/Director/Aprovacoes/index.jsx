import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPO_LABELS = { financeiro: 'Financeiro', rh: 'RH', pedagogico: 'Pedagógico', secretaria: 'Secretaria' }
const TIPO_COLORS = { financeiro: 'bg-yellow-100 text-yellow-700', rh: 'bg-orange-100 text-orange-700', pedagogico: 'bg-purple-100 text-purple-700', secretaria: 'bg-blue-100 text-blue-700' }
const ESTADO_COLORS = { pendente: 'bg-orange-100 text-orange-700', aprovado: 'bg-green-100 text-green-700', rejeitado: 'bg-red-100 text-red-700' }

function DecisaoModal({ item, onClose, onDecidido }) {
  const [estado, setEstado] = useState('aprovado')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    if (!obs.trim()) return alert('Observação obrigatória')
    setSaving(true)
    try {
      await api.patch(`/diretor/aprovacoes/${item.id}/decidir`, { estado, observacao: obs })
      onDecidido()
    } catch { alert('Erro ao decidir') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-outline-variant">
          <h3 className="font-bold text-on-surface">Decisão sobre Solicitação</h3>
          <p className="text-sm text-on-surface-variant mt-1">{item.titulo}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-surface-variant rounded-lg p-3 text-sm text-on-surface-variant">
            <p><span className="font-medium">Solicitante:</span> {item.solicitante_nome}</p>
            <p><span className="font-medium">Módulo:</span> {TIPO_LABELS[item.tipo]}</p>
            <p><span className="font-medium">Data:</span> {new Date(item.criado_em).toLocaleDateString('pt-MZ')}</p>
            {item.descricao && <p className="mt-2"><span className="font-medium">Motivo:</span> {item.descricao}</p>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEstado('aprovado')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${estado === 'aprovado' ? 'bg-green-600 text-white border-green-600' : 'border-outline-variant text-on-surface-variant hover:border-green-400'}`}
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">check_circle</span>
              Aprovar
            </button>
            <button
              onClick={() => setEstado('rejeitado')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${estado === 'rejeitado' ? 'bg-red-600 text-white border-red-600' : 'border-outline-variant text-on-surface-variant hover:border-red-400'}`}
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">cancel</span>
              Rejeitar
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Observação <span className="text-red-500">*</span></label>
            <textarea
              value={obs} onChange={e => setObs(e.target.value)}
              rows={3} placeholder="Justificação obrigatória..."
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors">Cancelar</button>
          <button onClick={confirmar} disabled={saving || !obs.trim()}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
            {saving ? 'A guardar...' : 'Confirmar Decisão'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Aprovacoes() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState('pendente')
  const [tipoFilter, setTipoFilter] = useState('')
  const [modal, setModal] = useState(null)

  const carregar = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (estadoFilter) params.set('estado', estadoFilter)
    if (tipoFilter) params.set('tipo', tipoFilter)
    api.get(`/diretor/aprovacoes?${params}`).then(r => setLista(r || [])).catch(() => setLista([])).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [estadoFilter, tipoFilter])

  const pendentes = lista.filter(i => i.estado === 'pendente').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Aprovações" subtitle="Solicitações de autorização dos departamentos" />

      {pendentes > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500 text-[20px]">notification_important</span>
          <span className="text-sm font-medium text-orange-700">{pendentes} solicitaç{pendentes > 1 ? 'ões' : 'ão'} pendente{pendentes > 1 ? 's' : ''} aguardando decisão</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos os estados</option>
          <option value="pendente">Pendentes</option>
          <option value="aprovado">Aprovados</option>
          <option value="rejeitado">Rejeitados</option>
        </select>
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos os módulos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-sm text-on-surface-variant">A carregar...</div>
        ) : lista.length === 0 ? (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-8 text-center text-sm text-on-surface-variant">
            Nenhuma solicitação encontrada
          </div>
        ) : lista.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[item.tipo]}`}>
                    {TIPO_LABELS[item.tipo]}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[item.estado]}`}>
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </span>
                  <span className="text-xs text-on-surface-variant">{item.subtipo}</span>
                </div>
                <h3 className="font-semibold text-on-surface text-sm">{item.titulo}</h3>
                {item.descricao && <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{item.descricao}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
                  <span>Solicitante: <span className="font-medium text-on-surface">{item.solicitante_nome}</span></span>
                  <span>{new Date(item.criado_em).toLocaleDateString('pt-MZ')}</span>
                </div>
                {item.director_observacao && (
                  <div className="mt-2 bg-surface-variant rounded-lg px-3 py-2 text-xs text-on-surface-variant">
                    <span className="font-medium">Observação:</span> {item.director_observacao}
                  </div>
                )}
              </div>
              {item.estado === 'pendente' && (
                <button onClick={() => setModal(item)}
                  className="flex-shrink-0 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                  Decidir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <DecisaoModal
          item={modal}
          onClose={() => setModal(null)}
          onDecidido={() => { setModal(null); carregar() }}
        />
      )}
    </div>
  )
}
