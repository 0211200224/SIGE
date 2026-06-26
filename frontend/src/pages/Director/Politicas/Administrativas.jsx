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
  <textarea {...props} rows={4} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
)

const defaultForm = {
  horario_abertura: '07:00',
  horario_encerramento: '17:00',
  dias_funcionamento: 'Segunda a Sexta',
  missao: '',
  visao: '',
  valores: '',
  regras_internas: '',
  politicas_gerais: '',
}

export default function PoliticasAdministrativas() {
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.get('/diretor/politicas/administrativas')
      .then(r => {
        const d = { ...defaultForm, ...(r || {}) }
        if (d.horario_abertura) d.horario_abertura = d.horario_abertura.substring(0, 5)
        if (d.horario_encerramento) d.horario_encerramento = d.horario_encerramento.substring(0, 5)
        setForm(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    setSaving(true)
    try {
      await api.put('/diretor/politicas/administrativas', form)
      setMsg({ txt: 'Políticas administrativas guardadas', tipo: 'success' })
    } catch { setMsg({ txt: 'Erro ao guardar', tipo: 'error' }) }
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  if (loading) return <div className="p-8 text-center text-sm text-on-surface-variant">A carregar...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Políticas Administrativas" subtitle="Horários de funcionamento, missão, visão e regras internas" />

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.txt}
        </div>
      )}

      <div className="space-y-6">
        {/* Horários */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-600">schedule</span>
            Horário de Funcionamento
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Hora de abertura"><Input type="time" value={form.horario_abertura} onChange={e => set('horario_abertura', e.target.value)} /></Field>
            <Field label="Hora de encerramento"><Input type="time" value={form.horario_encerramento} onChange={e => set('horario_encerramento', e.target.value)} /></Field>
          </div>
          <Field label="Dias de funcionamento"><Input value={form.dias_funcionamento} onChange={e => set('dias_funcionamento', e.target.value)} placeholder="Ex: Segunda a Sexta" /></Field>
        </div>

        {/* Identidade Institucional */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-purple-600">corporate_fare</span>
            Identidade Institucional
          </h3>
          <div className="space-y-4">
            <Field label="Missão"><Textarea value={form.missao || ''} onChange={e => set('missao', e.target.value)} placeholder="Qual é a missão da escola?" /></Field>
            <Field label="Visão"><Textarea value={form.visao || ''} onChange={e => set('visao', e.target.value)} placeholder="Qual é a visão da escola?" /></Field>
            <Field label="Valores"><Textarea value={form.valores || ''} onChange={e => set('valores', e.target.value)} placeholder="Quais são os valores da escola?" /></Field>
          </div>
        </div>

        {/* Regras e Políticas */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600">gavel</span>
            Regras e Políticas
          </h3>
          <div className="space-y-4">
            <Field label="Regras internas"><Textarea value={form.regras_internas || ''} onChange={e => set('regras_internas', e.target.value)} placeholder="Descreva as regras internas da escola..." /></Field>
            <Field label="Políticas gerais"><Textarea value={form.politicas_gerais || ''} onChange={e => set('politicas_gerais', e.target.value)} placeholder="Descreva as políticas gerais da instituição..." /></Field>
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
