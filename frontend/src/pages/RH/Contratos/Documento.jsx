import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'

const TIPO_LABEL = {
  efectivo: 'Contrato Efectivo (sem termo)',
  termo_certo: 'Contrato a Termo Certo',
  termo_incerto: 'Contrato a Termo Incerto',
  prestacao_servicos: 'Prestação de Serviços',
  estagio: 'Estágio',
}
const REGIME_LABEL = { mensal: 'Mensal', diario: 'Diário (por dia trabalhado)', horario: 'Horário (por hora trabalhada)' }
const ESTADO_LABEL = { activo: 'Activo', expirado: 'Expirado', rescindido: 'Rescindido', renovado: 'Renovado (substituído por contrato posterior)' }

function fmt(v) { return parseFloat(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) }
function fmtData(d) { return d ? new Date(d).toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' }
const numeroContrato = (ct) => ct.numero_contrato || `CT-${new Date(ct.data_inicio).getFullYear()}-${String(ct.id).padStart(4, '0')}`

export default function ContratoDocumento() {
  const { id } = useParams()
  const { escola } = useAuth()
  const [ct, setCt] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/rh/contratos/${id}`).then(r => setCt(r.data)).catch(err => setErro(err.message))
  }, [id])

  if (erro) return <div className="p-10 text-center text-on-surface-variant"><p className="font-medium">{erro}</p></div>
  if (!ct) return (
    <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  )

  const cor = escola?.cor_principal || '#1a2b4b'

  return (
    <div className="min-h-screen bg-surface-container-low print:bg-white">
      {/* Barra de acções — não imprime */}
      <div className="print:hidden sticky top-0 bg-white border-b border-outline-variant px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap z-10">
        <Link to={`/rh/funcionarios/${ct.funcionario_id}`} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>Voltar à ficha do funcionário
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">print</span>Imprimir / Baixar PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto my-8 print:my-0 px-4 sm:px-0">
        <div className="bg-white rounded-2xl print:rounded-none border border-outline-variant print:border-0 shadow-sm print:shadow-none p-6 sm:p-10 print:p-8">
          {/* Cabeçalho institucional */}
          <div className="flex items-start justify-between border-b-[3px] pb-4 mb-6" style={{ borderColor: cor }}>
            <div className="flex items-center gap-3">
              {escola?.logo && <img src={escola.logo} alt="" className="w-12 h-12 rounded-lg object-contain flex-shrink-0" />}
              <div>
                <h1 className="text-lg font-bold" style={{ color: cor }}>{escola?.nome || 'Escola'}</h1>
                {escola?.localizacao && <p className="text-xs text-on-surface-variant">{escola.localizacao}</p>}
                {escola?.contacto && <p className="text-xs text-on-surface-variant">{escola.contacto}</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold uppercase tracking-wide" style={{ color: cor }}>Contrato de Trabalho</p>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">Nº {numeroContrato(ct)}</p>
              <p className="text-[10px] text-on-surface-variant/70 mt-1">Emitido em {fmtData(new Date())}</p>
            </div>
          </div>

          {/* Identificação do funcionário, com foto */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-24 rounded-lg overflow-hidden bg-surface-bright border border-outline-variant flex items-center justify-center flex-shrink-0">
              {ct.funcionario_foto
                ? <img src={ct.funcionario_foto} alt={ct.funcionario_nome} className="w-full h-full object-cover" />
                : <span className="material-symbols-outlined text-on-surface-variant text-4xl">person</span>}
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">Nome Completo</p>
                <p className="font-semibold text-on-surface text-base">{ct.funcionario_nome}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Cargo</p>
                <p className="text-on-surface">{ct.cargo_nome || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Departamento</p>
                <p className="text-on-surface">{ct.departamento_nome || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">BI / Passaporte</p>
                <p className="text-on-surface">{ct.bi || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">NUIT</p>
                <p className="text-on-surface">{ct.nuit || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Data de Nascimento</p>
                <p className="text-on-surface">{fmtData(ct.data_nascimento)}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Nº Segurança Social</p>
                <p className="text-on-surface">{ct.numero_seguranca_social || '—'}</p>
              </div>
              {ct.endereco && (
                <div className="col-span-2">
                  <p className="text-xs text-on-surface-variant">Endereço</p>
                  <p className="text-on-surface">{ct.endereco}</p>
                </div>
              )}
            </div>
          </div>

          {/* Termos do contrato */}
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: cor }}>Termos do Contrato</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6 text-sm border border-outline-variant rounded-xl p-4">
            <div className="col-span-2">
              <p className="text-xs text-on-surface-variant">Tipo de Contrato</p>
              <p className="font-semibold text-on-surface">{TIPO_LABEL[ct.tipo] || ct.tipo}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Data de Início</p>
              <p className="text-on-surface">{fmtData(ct.data_inicio)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Data de Término</p>
              <p className="text-on-surface">{ct.data_fim ? fmtData(ct.data_fim) : 'Indeterminado'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Regime Salarial</p>
              <p className="text-on-surface">{REGIME_LABEL[ct.regime_salarial] || ct.regime_salarial}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">{ct.regime_salarial === 'mensal' ? 'Salário Mensal' : ct.regime_salarial === 'diario' ? 'Taxa Diária' : 'Taxa Horária'}</p>
              <p className="font-semibold text-on-surface">{fmt(ct.salario)} MT</p>
            </div>
            {ct.regime_salarial === 'mensal' && (
              <div>
                <p className="text-xs text-on-surface-variant">Horas Semanais</p>
                <p className="text-on-surface">{ct.horas_semanais}h / semana</p>
              </div>
            )}
            <div>
              <p className="text-xs text-on-surface-variant">Estado do Contrato</p>
              <p className="text-on-surface">{ESTADO_LABEL[ct.estado] || ct.estado}</p>
            </div>
            {ct.observacoes && (
              <div className="col-span-2 pt-1">
                <p className="text-xs text-on-surface-variant">Observações</p>
                <p className="text-on-surface">{ct.observacoes}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed mb-10">
            As partes abaixo identificadas declaram aceitar os termos descritos neste documento, que formaliza a
            relação de trabalho entre {escola?.nome || 'a Escola'} e {ct.funcionario_nome}.
          </p>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-10 mt-6">
            <div className="text-center">
              <div className="border-t border-on-surface-variant/40 pt-1.5">
                <p className="text-xs text-on-surface-variant">{ct.funcionario_nome}</p>
                <p className="text-[11px] text-on-surface-variant/70">O Funcionário</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-on-surface-variant/40 pt-1.5">
                <p className="text-xs text-on-surface-variant">{escola?.nome || 'Escola'}</p>
                <p className="text-[11px] text-on-surface-variant/70">Pela Entidade Empregadora</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-on-surface-variant/60 mt-10">
            Documento gerado pelo SIGE — Sistema Integrado de Gestão Escolar
          </p>
        </div>
      </div>
    </div>
  )
}
