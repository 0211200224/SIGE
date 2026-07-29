import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"

const STATUS_BADGE = {
  pendente: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

const emptyForm = { aluno_id: '', taxa_id: '', valor: '', mes_referencia: '', data_vencimento: '' }

export default function Cobrancas() {
  const [searchParams] = useSearchParams()
  const [cobrancas, setCobrancas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [taxas, setTaxas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAluno, setFilterAluno] = useState(searchParams.get('aluno_id') || '')
  const [showForm, setShowForm] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [bulkForm, setBulkForm] = useState({ class_group_id: '', taxa_id: '', mes_referencia: '', data_vencimento: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterAluno) params.set('aluno_id', filterAluno)
    Promise.all([
      api.get(`/financeiro/cobrancas?${params}`),
      api.get('/secretaria/alunos'),
      api.get('/financeiro/taxas'),
      api.get('/secretaria/turmas'),
    ]).then(([c, a, t, tu]) => {
      // /financeiro/* devolve o array directamente; /secretaria/* devolve { data: [...] }
      setCobrancas(Array.isArray(c) ? c : [])
      setAlunos(Array.isArray(a?.data) ? a.data : [])
      setTaxas(Array.isArray(t) ? t : [])
      setTurmas(Array.isArray(tu?.data) ? tu.data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [filterStatus, filterAluno])

  useEffect(() => { load() }, [load])

  const setF = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'taxa_id' && v) {
      const taxa = taxas.find(t => t.id == v)
      if (taxa && !f.valor) next.valor = taxa.valor
    }
    return next
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.aluno_id || !form.taxa_id) { setError('Aluno e taxa são obrigatórios'); return }
    setSaving(true)
    try {
      await api.post('/financeiro/cobrancas', {
        aluno_id: parseInt(form.aluno_id),
        taxa_id: parseInt(form.taxa_id),
        valor: parseFloat(form.valor) || null,
        mes_referencia: form.mes_referencia || null,
        data_vencimento: form.data_vencimento || null,
      })
      setForm(emptyForm); setShowForm(false); load()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleBulk = async (e) => {
    e.preventDefault()
    setError('')
    if (!bulkForm.class_group_id || !bulkForm.taxa_id) { setError('Turma e taxa são obrigatórias'); return }
    setSaving(true)
    try {
      const r = await api.post('/financeiro/cobrancas/gerar-turma', {
        class_group_id: parseInt(bulkForm.class_group_id),
        taxa_id: parseInt(bulkForm.taxa_id),
        mes_referencia: bulkForm.mes_referencia || null,
        data_vencimento: bulkForm.data_vencimento || null,
      })
      alert(`${r?.criados ?? 0} cobrança(s) criada(s) de ${r?.total_alunos ?? 0} aluno(s).`)
      setShowBulk(false); setBulkForm({ class_group_id: '', taxa_id: '', mes_referencia: '', data_vencimento: '' }); load()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const cancelar = async (id) => {
    if (!window.confirm('Cancelar esta cobrança?')) return
    try { await api.delete(`/financeiro/cobrancas/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  const [multaModal, setMultaModal] = useState(null)
  const [multaForm, setMultaForm] = useState({ multa_valor: '', motivo: '' })
  const [aplicandoMulta, setAplicandoMulta] = useState(false)

  const abrirMulta = (c) => { setMultaModal(c); setMultaForm({ multa_valor: c.multa_valor && Number(c.multa_valor) > 0 ? String(c.multa_valor) : '', motivo: c.multa_motivo || '' }) }

  const handleMulta = async (e) => {
    e.preventDefault()
    setAplicandoMulta(true)
    try {
      await api.patch(`/financeiro/cobrancas/${multaModal.id}/multa`, {
        multa_valor: parseFloat(multaForm.multa_valor) || 0,
        motivo: multaForm.motivo || null,
      })
      setMultaModal(null); load()
    } catch (err) { alert(err.message) }
    finally { setAplicandoMulta(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Cobranças" subtitle="Gerir cobranças individuais ou por turma"
        action={
          <div className="flex gap-2">
            <button onClick={() => { setShowBulk(v => !v); setShowForm(false); setError('') }}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors">
              <span className="material-symbols-outlined text-[16px]">groups</span>Por Turma
            </button>
            <button onClick={() => { setShowForm(v => !v); setShowBulk(false); setError('') }}
              className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-[16px]">{showForm ? 'close' : 'add'}</span>
              Nova Cobrança
            </button>
          </div>
        }
      />

      {/* Formulário individual */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-sm mb-4">Nova Cobrança Individual</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Aluno *</label>
              <select value={form.aluno_id} onChange={e => setF('aluno_id', e.target.value)} className={inputCls}>
                <option value="">Seleccionar aluno</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Taxa *</label>
              <select value={form.taxa_id} onChange={e => setF('taxa_id', e.target.value)} className={inputCls}>
                <option value="">Seleccionar taxa</option>
                {taxas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor (MT)</label>
              <input type="number" value={form.valor} onChange={e => setF('valor', e.target.value)} className={inputCls} placeholder="Auto (da taxa)" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Mês Referência</label>
              <input type="month" value={form.mes_referencia} onChange={e => setF('mes_referencia', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Data Vencimento</label>
              <input type="date" value={form.data_vencimento} onChange={e => setF('data_vencimento', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-outline-variant rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm disabled:opacity-60">
              {saving ? 'A criar...' : 'Criar Cobrança'}
            </button>
          </div>
        </form>
      )}

      {/* Formulário por turma */}
      {showBulk && (
        <form onSubmit={handleBulk} className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[18px]">groups</span>
            Gerar Cobranças para Turma
          </h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Turma *</label>
              <select value={bulkForm.class_group_id} onChange={e => setBulkForm(f => ({ ...f, class_group_id: e.target.value }))} className={inputCls}>
                <option value="">Seleccionar turma</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} · {t.classe_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Taxa *</label>
              <select value={bulkForm.taxa_id} onChange={e => setBulkForm(f => ({ ...f, taxa_id: e.target.value }))} className={inputCls}>
                <option value="">Seleccionar taxa</option>
                {taxas.map(t => <option key={t.id} value={t.id}>{t.nome} — {fmt(t.valor)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Mês Referência</label>
              <input type="month" value={bulkForm.mes_referencia} onChange={e => setBulkForm(f => ({ ...f, mes_referencia: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Data Vencimento</label>
              <input type="date" value={bulkForm.data_vencimento} onChange={e => setBulkForm(f => ({ ...f, data_vencimento: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">Serão criadas cobranças para todos os alunos activos da turma seleccionada (duplicados ignorados).</p>
          <div className="flex justify-end mt-4 gap-2">
            <button type="button" onClick={() => setShowBulk(false)} className="px-4 py-2 text-sm border border-outline-variant rounded-lg bg-white">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
              {saving ? 'A gerar...' : 'Gerar Cobranças'}
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os estados</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select value={filterAluno} onChange={e => setFilterAluno(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os alunos</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : cobrancas.length === 0 ? (
        <EmptyState icon="request_quote" title="Nenhuma cobrança" description="Crie cobranças individuais ou para uma turma inteira." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant text-xs">Aluno</th>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant text-xs">Taxa</th>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant text-xs">Mês Ref.</th>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant text-xs">Vencimento</th>
                <th className="text-right px-4 py-3 font-medium text-on-surface-variant text-xs">Valor</th>
                <th className="text-right px-4 py-3 font-medium text-on-surface-variant text-xs">Multa</th>
                <th className="text-center px-4 py-3 font-medium text-on-surface-variant text-xs">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cobrancas.map((c, i) => (
                <tr key={c.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{c.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant">{c.numero_matricula}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.taxa_nome}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.mes_referencia || '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString('pt-MZ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-on-surface">{fmt(c.valor)}</td>
                  <td className="px-4 py-3 text-right">
                    {Number(c.multa_valor) > 0
                      ? <span className="text-red-600 font-medium">{fmt(c.multa_valor)}</span>
                      : <span className="text-on-surface-variant">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {['pendente', 'vencido'].includes(c.status) && (
                        <button onClick={() => abrirMulta(c)}
                          className="text-amber-500 hover:text-amber-700 p-1 rounded" title="Aplicar/editar multa">
                          <span className="material-symbols-outlined text-[16px]">gavel</span>
                        </button>
                      )}
                      {c.status === 'pendente' && (
                        <button onClick={() => cancelar(c.id)} className="text-red-400 hover:text-red-600 p-1 rounded" title="Cancelar">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Multa — decisao manual do Financeiro: se aplica e quanto, cobranca a cobranca */}
      {multaModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleMulta} className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">gavel</span>Aplicar Multa
              </h2>
              <button type="button" onClick={() => setMultaModal(null)} className="p-1.5 hover:bg-surface-container rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-surface-container-low rounded-xl p-3 text-sm">
                <p className="font-semibold">{multaModal.aluno_nome}</p>
                <p className="text-xs text-on-surface-variant">{multaModal.taxa_nome} {multaModal.mes_referencia ? `· ${multaModal.mes_referencia}` : ''} — dívida {fmt(multaModal.valor)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor da Multa (MT)</label>
                <input type="number" min="0" step="0.01" autoFocus className={inputCls}
                  value={multaForm.multa_valor} onChange={e => setMultaForm(f => ({ ...f, multa_valor: e.target.value }))}
                  placeholder="0.00 (0 remove a multa)" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Motivo</label>
                <textarea className={inputCls + ' resize-none'} rows={2} value={multaForm.motivo}
                  onChange={e => setMultaForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Opcional" />
              </div>
              <p className="text-xs text-on-surface-variant">A decisão de aplicar multa e o respectivo valor ficam sempre ao critério do Financeiro — nada é calculado automaticamente.</p>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button type="button" onClick={() => setMultaModal(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button type="submit" disabled={aplicandoMulta} className="px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-60">
                {aplicandoMulta ? 'A guardar...' : 'Guardar Multa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
