import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-on-surface mb-1.5">{label}</label>
    {children}
  </div>
)
const Input = (props) => (
  <input {...props} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
)
const Textarea = (props) => (
  <textarea {...props} rows={3} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
)

const defaultForm = {
  dias_tolerancia_pagamento: 5,
  percentagem_multa: 2,
  max_desconto_percentagem: 20,
  max_bolsa_percentagem: 100,
  regras_inadimplencia: '',
  politica_descontos: '',
  politica_bolsas: '',
  regras_cobranca: '',
  bloquear_acesso_divida: false,
}

export default function PoliticasFinanceiras() {
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.get('/diretor/politicas/financeiras')
      .then(r => { const d = r || {}; setForm({ ...defaultForm, ...d, bloquear_acesso_divida: !!d.bloquear_acesso_divida }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    setSaving(true)
    try {
      await api.put('/diretor/politicas/financeiras', form)
      setMsg({ txt: 'Políticas financeiras guardadas', tipo: 'success' })
    } catch { setMsg({ txt: 'Erro ao guardar', tipo: 'error' }) }
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  if (loading) return <div className="p-8 text-center text-sm text-on-surface-variant">A carregar...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Políticas Financeiras" subtitle="Regras de pagamento, descontos, bolsas e cobrança" />

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.txt}
        </div>
      )}

      <div className="space-y-6">
        {/* Pagamento e Multas */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-yellow-600">payments</span>
            Pagamento e Multas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dias de tolerância de pagamento">
              <Input type="number" min="0" value={form.dias_tolerancia_pagamento} onChange={e => set('dias_tolerancia_pagamento', e.target.value)} />
            </Field>
            <Field label="Percentagem de multa por atraso (%)">
              <Input type="number" min="0" max="100" step="0.5" value={form.percentagem_multa} onChange={e => set('percentagem_multa', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('bloquear_acesso_divida', !form.bloquear_acesso_divida)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${form.bloquear_acesso_divida ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.bloquear_acesso_divida ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-on-surface">Bloquear acesso ao sistema com dívida em aberto</span>
            </label>
          </div>
        </div>

        {/* Descontos e Bolsas */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-green-600">discount</span>
            Descontos e Bolsas
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Desconto máximo permitido (%)">
              <Input type="number" min="0" max="100" value={form.max_desconto_percentagem} onChange={e => set('max_desconto_percentagem', e.target.value)} />
            </Field>
            <Field label="Bolsa máxima permitida (%)">
              <Input type="number" min="0" max="100" value={form.max_bolsa_percentagem} onChange={e => set('max_bolsa_percentagem', e.target.value)} />
            </Field>
          </div>
          <div className="space-y-4">
            <Field label="Política de descontos"><Textarea value={form.politica_descontos || ''} onChange={e => set('politica_descontos', e.target.value)} placeholder="Descreva a política de descontos..." /></Field>
            <Field label="Política de bolsas"><Textarea value={form.politica_bolsas || ''} onChange={e => set('politica_bolsas', e.target.value)} placeholder="Descreva a política de bolsas..." /></Field>
          </div>
        </div>

        {/* Inadimplência e Cobrança */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-red-600">money_off</span>
            Inadimplência e Cobrança
          </h3>
          <div className="space-y-4">
            <Field label="Regras de inadimplência"><Textarea value={form.regras_inadimplencia || ''} onChange={e => set('regras_inadimplencia', e.target.value)} placeholder="Defina as regras de inadimplência..." /></Field>
            <Field label="Regras de cobrança"><Textarea value={form.regras_cobranca || ''} onChange={e => set('regras_cobranca', e.target.value)} placeholder="Defina as regras de cobrança..." /></Field>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={salvar} disabled={saving}
            className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'A guardar...' : 'Guardar Políticas'}
          </button>
        </div>
      </div>
    </div>
  )
}
