import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'

const TIPO_LABEL = {
  interna: 'Transferência Interna',
  externa_saida: 'Saída Externa (Transferência para outra escola)',
  externa_entrada: 'Entrada Externa (Transferência de outra escola)',
  mudanca_turma: 'Mudança de Turma',
  mudanca_curso: 'Mudança de Curso',
}
const STATUS_LABEL = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' }

function fmtData(d) {
  return d ? new Date(d).toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
}
const numeroBoletim = (t) => `TR-${new Date(t.data || t.criado_em).getFullYear()}-${String(t.id).padStart(4, '0')}`

export default function BoletimTransferencia() {
  const { id } = useParams()
  const { escola } = useAuth()
  const [t, setT] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/secretaria/transferencias/${id}`).then(r => setT(r.data)).catch(err => setErro(err.message))
  }, [id])

  if (erro) return <div className="p-10 text-center text-on-surface-variant"><p className="font-medium">{erro}</p></div>
  if (!t) return (
    <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  )

  const cor = escola?.cor_principal || '#1a2b4b'
  const interna = ['interna', 'mudanca_turma', 'mudanca_curso'].includes(t.tipo)
  const saida = t.tipo === 'externa_saida'
  const entrada = t.tipo === 'externa_entrada'

  return (
    <div className="min-h-screen bg-surface-container-low print:bg-white">
      {/* Barra de acções — não imprime */}
      <div className="print:hidden sticky top-0 bg-white border-b border-outline-variant px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap z-10">
        <Link to="/secretaria/transferencias" className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>Voltar às transferências
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">print</span>Imprimir / Baixar PDF
        </button>
      </div>

      <div className="max-w-2xl mx-auto my-8 print:my-0 px-4 sm:px-0">
        <div className="bg-white rounded-2xl print:rounded-none border border-outline-variant print:border-0 shadow-sm print:shadow-none p-6 sm:p-8 print:p-4">
          {/* Cabeçalho institucional */}
          <div className="flex items-start justify-between border-b-[3px] pb-3 mb-5" style={{ borderColor: cor }}>
            <div className="flex items-center gap-3">
              {escola?.logo && <img src={escola.logo} alt="" className="w-11 h-11 rounded-lg object-contain flex-shrink-0" />}
              <div>
                <h1 className="text-base font-bold" style={{ color: cor }}>{escola?.nome || 'Escola'}</h1>
                {escola?.localizacao && <p className="text-xs text-on-surface-variant">{escola.localizacao}</p>}
                {escola?.contacto && <p className="text-xs text-on-surface-variant">{escola.contacto}</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cor }}>Boletim de Transferência</p>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">Nº {numeroBoletim(t)}</p>
              <p className="text-[10px] text-on-surface-variant/70 mt-1">Emitido em {fmtData(new Date())}</p>
            </div>
          </div>

          {/* Identificação do aluno */}
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: cor }}>Identificação do Aluno</p>
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="col-span-2">
              <p className="text-xs text-on-surface-variant">Nome Completo</p>
              <p className="font-semibold text-on-surface">{t.aluno_nome}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Nº de Matrícula</p>
              <p className="font-mono text-on-surface">{t.numero_matricula || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Data de Nascimento</p>
              <p className="text-on-surface">{fmtData(t.data_nascimento)}</p>
            </div>
            {t.nome_encarregado && (
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">Encarregado de Educação</p>
                <p className="text-on-surface">{t.nome_encarregado}</p>
              </div>
            )}
          </div>

          {/* Detalhes da transferência */}
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: cor }}>Detalhes da Transferência</p>
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="col-span-2">
              <p className="text-xs text-on-surface-variant">Tipo</p>
              <p className="font-semibold text-on-surface">{TIPO_LABEL[t.tipo] || t.tipo}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Data da Transferência</p>
              <p className="text-on-surface">{fmtData(t.data)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Estado</p>
              <p className="text-on-surface">{STATUS_LABEL[t.status] || t.status}</p>
            </div>
            {interna && (
              <>
                <div>
                  <p className="text-xs text-on-surface-variant">Turma de Origem</p>
                  <p className="text-on-surface">{t.turma_origem_nome ? `${t.turma_origem_nome} — ${t.classe_origem_nome || ''}` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Turma de Destino</p>
                  <p className="text-on-surface">{t.turma_destino_nome ? `${t.turma_destino_nome} — ${t.classe_destino_nome || ''}` : '—'}</p>
                </div>
              </>
            )}
            {saida && (
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">Escola de Destino</p>
                <p className="text-on-surface">{t.escola_destino || '—'}</p>
              </div>
            )}
            {entrada && (
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">Escola de Origem</p>
                <p className="text-on-surface">{t.escola_origem || '—'}</p>
              </div>
            )}
            {t.motivo && (
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">Motivo</p>
                <p className="text-on-surface">{t.motivo}</p>
              </div>
            )}
            {t.observacoes && (
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">Observações</p>
                <p className="text-on-surface">{t.observacoes}</p>
              </div>
            )}
          </div>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-8 mt-10 pt-6">
            <div className="text-center">
              <div className="border-t border-on-surface-variant/40 pt-1.5">
                <p className="text-xs text-on-surface-variant">Responsável pela Secretaria</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-on-surface-variant/40 pt-1.5">
                <p className="text-xs text-on-surface-variant">Encarregado de Educação / Aluno</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-on-surface-variant/60 mt-8">
            Documento gerado pelo SIGE — Sistema Integrado de Gestão Escolar
          </p>
        </div>
      </div>
    </div>
  )
}
