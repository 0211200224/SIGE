import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const STATUS_CLS = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-500',
  suspenso: 'bg-amber-100 text-amber-700',
  transferido: 'bg-blue-100 text-blue-700',
  concluido: 'bg-purple-100 text-purple-700',
  desistente: 'bg-red-100 text-red-600',
}
const PARENTESCO = ['Pai','Mãe','Pai/Mãe','Avó','Avô','Tio','Tia','Irmão','Irmã','Tutor Legal','Outro']
const TIPO_SOL = {
  declaracao:'Declaração', historico:'Histórico', certificado:'Certificado',
  declaracao_matricula:'Declaração de Matrícula', declaracao_frequencia:'Declaração de Frequência', comprovativo:'Comprovativo'
}
const STATUS_MAT = { matriculado:'bg-green-100 text-green-700', pendente:'bg-yellow-100 text-yellow-700', cancelado:'bg-red-100 text-red-600', activo:'bg-green-100 text-green-700' }

const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white"

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-on-surface-variant mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dados')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState(null)
  const [modalEnc, setModalEnc] = useState(false)
  const [encForm, setEncForm] = useState({ nome:'', parentesco:'Pai/Mãe', telefone:'', email:'', endereco:'', profissao:'', principal: false })
  const [savingEnc, setSavingEnc] = useState(false)
  const [modalSol, setModalSol] = useState(false)
  const [solForm, setSolForm] = useState({ tipo:'declaracao_matricula', observacoes:'' })

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/secretaria/alunos/${id}`),
      api.get('/secretaria/turmas'),
    ]).then(([a, t]) => {
      setAluno(a.data)
      setTurmas(t.data || [])
      const d = a.data
      setForm({
        nome: d.nome || '', foto: d.foto || '',
        data_nascimento: d.data_nascimento?.slice(0,10) || '',
        genero: d.genero || '', naturalidade: d.naturalidade || '',
        nacionalidade: d.nacionalidade || 'Moçambicana', bi: d.bi || '',
        telefone: d.telefone || '', email: d.email || '', endereco: d.endereco || '',
        curso: d.curso || '', turno: d.turno || '', ano_lectivo: d.ano_lectivo || '',
        nome_encarregado: d.nome_encarregado || '', tel_encarregado: d.tel_encarregado || '',
        parentesco: d.parentesco || 'Pai/Mãe', class_group_id: d.class_group_id || '',
        status: d.status || 'activo',
      })
    }).catch(() => navigate('/secretaria/alunos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSuccess(false); setSaving(true)
    try {
      await api.put(`/secretaria/alunos/${id}`, { ...form, class_group_id: form.class_group_id || null })
      setSuccess(true); load()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const handleStatus = async (status) => {
    if (!window.confirm(`Alterar situação para "${status}"?`)) return
    try { await api.patch(`/secretaria/alunos/${id}/status`, { status }); load() }
    catch (err) { alert(err.message) }
  }

  const handleAddEncarregado = async (e) => {
    e.preventDefault(); setSavingEnc(true)
    try {
      await api.post('/secretaria/encarregados', { ...encForm, aluno_id: id })
      setModalEnc(false)
      setEncForm({ nome:'', parentesco:'Pai/Mãe', telefone:'', email:'', endereco:'', profissao:'', principal: false })
      load()
    } catch (err) { alert(err.message) } finally { setSavingEnc(false) }
  }

  const handleRemoveEncarregado = async (encId) => {
    if (!window.confirm('Remover este encarregado do aluno?')) return
    try { await api.delete(`/secretaria/alunos/${id}/encarregados/${encId}`); load() }
    catch (err) { alert(err.message) }
  }

  const handleSolicitacao = async (e) => {
    e.preventDefault()
    try {
      await api.post('/secretaria/solicitacoes', { aluno_id: id, ...solForm })
      setModalSol(false); setSolForm({ tipo:'declaracao_matricula', observacoes:'' }); load()
    } catch (err) { alert(err.message) }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )
  if (!aluno || !form) return null

  const TABS = [
    { key: 'dados', label: 'Dados', icon: 'person' },
    { key: 'encarregados', label: 'Encarregados', icon: 'supervisor_account', badge: aluno.encarregados?.length },
    { key: 'matriculas', label: 'Matrículas', icon: 'assignment', badge: aluno.matriculas?.length },
    { key: 'documentos', label: 'Documentos', icon: 'folder', badge: aluno.documentos?.length },
    { key: 'solicitacoes', label: 'Solicitações', icon: 'pending_actions', badge: aluno.solicitacoes?.filter(s=>s.status==='pendente').length || 0 },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title={aluno.nome}
        subtitle={`Nº ${aluno.numero_matricula || '—'} · ${aluno.turma_nome || 'Sem turma'}`}
        action={
          <Link to="/secretaria/alunos" className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Voltar
          </Link>
        }
      />

      {/* Cabeçalho resumo */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-5 flex items-center gap-5 flex-wrap">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0 overflow-hidden">
          {aluno.foto
            ? <img src={aluno.foto} alt={aluno.nome} className="w-full h-full object-cover" />
            : aluno.nome?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-on-surface text-lg">{aluno.nome}</h2>
          <p className="text-sm text-on-surface-variant">{aluno.turma_nome || 'Sem turma'}{aluno.classe_nome ? ` · ${aluno.classe_nome}` : ''}</p>
          {aluno.codigo_acesso && (
            <span className="inline-flex items-center gap-1 font-mono text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-lg border border-primary/15 mt-1">
              <span className="material-symbols-outlined text-[13px]">badge</span>{aluno.codigo_acesso}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_CLS[aluno.status] || 'bg-gray-100 text-gray-600'}`}>
            {aluno.status}
          </span>
          <div className="relative group">
            <button className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant rounded-lg px-2.5 py-1.5 hover:bg-surface-bright transition-colors">
              <span className="material-symbols-outlined text-[15px]">edit_note</span>Alterar Situação
            </button>
            <div className="absolute right-0 mt-1 bg-white border border-outline-variant rounded-xl shadow-lg z-10 min-w-[160px] hidden group-hover:block">
              {['activo','suspenso','transferido','concluido','desistente','inactivo'].map(s => (
                <button key={s} onClick={() => handleStatus(s)}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-bright first:rounded-t-xl last:rounded-b-xl capitalize ${aluno.status===s?'font-bold text-primary':''}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab===t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] bg-primary/15 text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Dados ── */}
      {tab === 'dados' && (
        <form onSubmit={handleSave} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Dados guardados com sucesso.</div>}

          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome Completo *"><input required value={form.nome} onChange={e=>set('nome',e.target.value)} className={inp} /></Field>
              <Field label="Data de Nascimento"><input type="date" value={form.data_nascimento} onChange={e=>set('data_nascimento',e.target.value)} className={inp} /></Field>
              <Field label="Género">
                <select value={form.genero} onChange={e=>set('genero',e.target.value)} className={inp}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </Field>
              <Field label="BI / Certidão"><input value={form.bi} onChange={e=>set('bi',e.target.value)} className={inp} /></Field>
              <Field label="Naturalidade"><input value={form.naturalidade} onChange={e=>set('naturalidade',e.target.value)} className={inp} /></Field>
              <Field label="Nacionalidade"><input value={form.nacionalidade} onChange={e=>set('nacionalidade',e.target.value)} className={inp} /></Field>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">contacts</span>Contactos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefone"><input value={form.telefone} onChange={e=>set('telefone',e.target.value)} className={inp} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inp} /></Field>
              <div className="sm:col-span-2"><Field label="Endereço"><input value={form.endereco} onChange={e=>set('endereco',e.target.value)} className={inp} /></Field></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">school</span>Dados Académicos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Turma">
                <select value={form.class_group_id} onChange={e=>set('class_group_id',e.target.value)} className={inp}>
                  <option value="">Sem turma</option>
                  {turmas.map(t=><option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
                </select>
              </Field>
              <Field label="Turno">
                <select value={form.turno} onChange={e=>set('turno',e.target.value)} className={inp}>
                  <option value="">Seleccionar</option>
                  <option>Manhã</option><option>Tarde</option><option>Noite</option>
                </select>
              </Field>
              <Field label="Curso"><input value={form.curso} onChange={e=>set('curso',e.target.value)} className={inp} placeholder="Ex: Informática, Geral" /></Field>
              <Field label="Ano Lectivo"><input value={form.ano_lectivo} onChange={e=>set('ano_lectivo',e.target.value)} className={inp} placeholder="2026" /></Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 hover:-translate-y-0.5 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      )}

      {/* ── Encarregados ── */}
      {tab === 'encarregados' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-on-surface-variant">{aluno.encarregados?.length || 0} encarregado(s) associado(s)</p>
            <button onClick={() => setModalEnc(true)}
              className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-medium hover:-translate-y-0.5 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">add</span>Adicionar
            </button>
          </div>

          {modalEnc && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Novo Encarregado</h3>
                  <button onClick={() => setModalEnc(false)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
                </div>
                <form onSubmit={handleAddEncarregado} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Field label="Nome *"><input required value={encForm.nome} onChange={e=>setEncForm(f=>({...f,nome:e.target.value}))} className={inp} /></Field></div>
                    <Field label="Parentesco">
                      <select value={encForm.parentesco} onChange={e=>setEncForm(f=>({...f,parentesco:e.target.value}))} className={inp}>
                        {PARENTESCO.map(p=><option key={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Profissão"><input value={encForm.profissao} onChange={e=>setEncForm(f=>({...f,profissao:e.target.value}))} className={inp} /></Field>
                    <Field label="Telefone"><input value={encForm.telefone} onChange={e=>setEncForm(f=>({...f,telefone:e.target.value}))} className={inp} /></Field>
                    <Field label="Email"><input type="email" value={encForm.email} onChange={e=>setEncForm(f=>({...f,email:e.target.value}))} className={inp} /></Field>
                    <div className="col-span-2"><Field label="Endereço"><input value={encForm.endereco} onChange={e=>setEncForm(f=>({...f,endereco:e.target.value}))} className={inp} /></Field></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={encForm.principal} onChange={e=>setEncForm(f=>({...f,principal:e.target.checked}))} />
                    Encarregado principal
                  </label>
                  <div className="flex gap-3 justify-end pt-1">
                    <button type="button" onClick={()=>setModalEnc(false)} className="px-4 py-2 text-sm rounded-xl border border-outline-variant">Cancelar</button>
                    <button type="submit" disabled={savingEnc} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
                      {savingEnc?'A guardar...':'Adicionar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {aluno.encarregados?.length === 0 ? (
            <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">supervisor_account</span>
              <p className="text-sm text-on-surface-variant">Nenhum encarregado associado.</p>
            </div>
          ) : aluno.encarregados.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold flex-shrink-0 text-sm">
                {e.nome?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-on-surface">{e.nome}</p>
                  {e.principal ? <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Principal</span> : null}
                </div>
                <p className="text-xs text-on-surface-variant">{e.parentesco}{e.profissao ? ` · ${e.profissao}` : ''}</p>
                {e.telefone && <p className="text-xs text-on-surface-variant">{e.telefone}{e.email ? ` · ${e.email}` : ''}</p>}
              </div>
              <button onClick={() => handleRemoveEncarregado(e.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg" title="Remover">
                <span className="material-symbols-outlined text-[18px]">link_off</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Matrículas ── */}
      {tab === 'matriculas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link to="/secretaria/matriculas/nova"
              className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-medium hover:-translate-y-0.5 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">add</span>Nova Matrícula
            </Link>
          </div>
          {aluno.matriculas?.length === 0 ? (
            <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">assignment</span>
              <p className="text-sm text-on-surface-variant">Nenhuma matrícula encontrada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Nº Matrícula</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Ano</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {aluno.matriculas.map(m => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-mono text-xs">{m.numero_matricula || '—'}</td>
                      <td className="px-4 py-3"><p className="font-medium">{m.turma_nome || '—'}</p><p className="text-xs text-on-surface-variant">{m.classe_nome}</p></td>
                      <td className="px-4 py-3 text-on-surface-variant text-sm">{m.ano_lectivo}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAT[m.status] || 'bg-gray-100 text-gray-600'}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Documentos ── */}
      {tab === 'documentos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link to="/secretaria/documentos" className="text-sm text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>Ver arquivo completo
            </Link>
          </div>
          {aluno.documentos?.length === 0 ? (
            <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">folder_open</span>
              <p className="text-sm text-on-surface-variant">Nenhum documento no arquivo deste aluno.</p>
            </div>
          ) : aluno.documentos.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-outline-variant p-4 flex items-center gap-3 shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">description</span>
              <div className="flex-1"><p className="font-medium text-sm">{d.tipo}</p>{d.descricao && <p className="text-xs text-on-surface-variant">{d.descricao}</p>}</div>
              <span className="text-xs text-on-surface-variant">{d.data_doc ? new Date(d.data_doc).toLocaleDateString('pt-MZ') : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Solicitações ── */}
      {tab === 'solicitacoes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-on-surface-variant">{aluno.solicitacoes?.length || 0} solicitação(ões)</p>
            <button onClick={() => setModalSol(true)}
              className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-medium hover:-translate-y-0.5 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">add</span>Nova Solicitação
            </button>
          </div>

          {modalSol && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Nova Solicitação</h3>
                  <button onClick={()=>setModalSol(false)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
                </div>
                <form onSubmit={handleSolicitacao} className="space-y-3">
                  <Field label="Tipo de Documento">
                    <select value={solForm.tipo} onChange={e=>setSolForm(f=>({...f,tipo:e.target.value}))} className={inp}>
                      {Object.entries(TIPO_SOL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Observações">
                    <textarea value={solForm.observacoes} onChange={e=>setSolForm(f=>({...f,observacoes:e.target.value}))} rows={2} className={inp+' resize-none'} placeholder="Opcional" />
                  </Field>
                  <div className="flex gap-3 justify-end pt-1">
                    <button type="button" onClick={()=>setModalSol(false)} className="px-4 py-2 text-sm rounded-xl border border-outline-variant">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold">Criar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {aluno.solicitacoes?.length === 0 ? (
            <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">pending_actions</span>
              <p className="text-sm text-on-surface-variant">Nenhuma solicitação de documento.</p>
            </div>
          ) : aluno.solicitacoes.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-outline-variant p-4 flex items-center gap-3 shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">receipt_long</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{TIPO_SOL[s.tipo] || s.tipo}</p>
                {s.numero_doc && <p className="text-xs text-on-surface-variant font-mono">{s.numero_doc}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                s.status==='pendente'?'bg-yellow-100 text-yellow-700':s.status==='concluida'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'
              }`}>{s.status?.replace('_',' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
