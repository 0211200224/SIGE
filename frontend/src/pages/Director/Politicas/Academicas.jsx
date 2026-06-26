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
  nota_minima_aprovacao: 10,
  frequencia_minima: 75,
  escala_max: 20,
  nota_exame_minima: 8,
  permite_recurso: true,
  nota_minima_recurso: 8,
  criterio_aprovacao: '',
  criterio_reprovacao: '',
  regras_exame: '',
  regras_recuperacao: '',
}

export default function PoliticasAcademicas() {
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.get('/diretor/politicas/academicas')
      .then(r => setForm({ ...defaultForm, ...(r || {}) }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    setSaving(true)
    try {
      await api.put('/diretor/politicas/academicas', form)
      setMsg({ txt: 'Políticas académicas guardadas com sucesso', tipo: 'success' })
    } catch {
      setMsg({ txt: 'Erro ao guardar', tipo: 'error' })
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  if (loading) return <div className="p-8 text-center text-sm text-on-surface-variant">A carregar...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Políticas Académicas" subtitle="Critérios de avaliação, aprovação e frequência" />

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.txt}
        </div>
      )}

      <div className="space-y-6">
        {/* Notas e Frequência */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-purple-600">grade</span>
            Notas e Frequência
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nota mínima de aprovação">
              <Input type="number" min="0" max="20" step="0.5" value={form.nota_minima_aprovacao} onChange={e => set('nota_minima_aprovacao', e.target.value)} />
            </Field>
            <Field label="Escala máxima">
              <Input type="number" min="10" max="100" value={form.escala_max} onChange={e => set('escala_max', e.target.value)} />
            </Field>
            <Field label="Frequência mínima (%)">
              <Input type="number" min="0" max="100" value={form.frequencia_minima} onChange={e => set('frequencia_minima', e.target.value)} />
            </Field>
            <Field label="Nota mínima para exame">
              <Input type="number" min="0" max="20" step="0.5" value={form.nota_exame_minima} onChange={e => set('nota_exame_minima', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Recurso */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-600">replay</span>
            Recurso e Recuperação
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Permite recurso">
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => set('permite_recurso', true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.permite_recurso ? 'bg-primary text-white border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
                >
                  Sim
                </button>
                <button
                  onClick={() => set('permite_recurso', false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.permite_recurso ? 'bg-primary text-white border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
                >
                  Não
                </button>
              </div>
            </Field>
            <Field label="Nota mínima para recurso">
              <Input type="number" min="0" max="20" step="0.5" value={form.nota_minima_recurso} onChange={e => set('nota_minima_recurso', e.target.value)} disabled={!form.permite_recurso} />
            </Field>
          </div>
        </div>

        {/* Critérios e Regras */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-semibold text-on-surface text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">rule</span>
            Critérios e Regras
          </h3>
          <div className="space-y-4">
            <Field label="Critérios de aprovação"><Textarea value={form.criterio_aprovacao || ''} onChange={e => set('criterio_aprovacao', e.target.value)} placeholder="Descreva os critérios de aprovação..." /></Field>
            <Field label="Critérios de reprovação"><Textarea value={form.criterio_reprovacao || ''} onChange={e => set('criterio_reprovacao', e.target.value)} placeholder="Descreva os critérios de reprovação..." /></Field>
            <Field label="Regras de exame"><Textarea value={form.regras_exame || ''} onChange={e => set('regras_exame', e.target.value)} placeholder="Descreva as regras de exame..." /></Field>
            <Field label="Regras de recuperação"><Textarea value={form.regras_recuperacao || ''} onChange={e => set('regras_recuperacao', e.target.value)} placeholder="Descreva as regras de recuperação..." /></Field>
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
