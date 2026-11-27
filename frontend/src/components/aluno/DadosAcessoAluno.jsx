import { useEffect, useState } from 'react'
import { api } from '../../services/api'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Folha de credenciais para entregar ao aluno/encarregado (impressão ou PDF
// pelo diálogo de impressão do browser). Usada no registo do aluno e sempre
// que a secretaria precisar de voltar a entregar os dados de acesso.
export function imprimirCredenciaisAluno({ escola, nome, codigo, senha, numero_matricula }) {
  const cor = escola?.cor_principal || '#1a2b4b'
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`
    <html><head><title>Credenciais — ${esc(nome)}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111;max-width:420px}
      h1{font-size:14px;margin:0 0 2px}p{margin:2px 0;color:#555}
      .header{border-bottom:3px solid ${esc(cor)};padding-bottom:10px;margin-bottom:16px;display:flex;align-items:center;gap:10px}
      .header img{width:40px;height:40px;object-fit:contain;border-radius:8px}
      .titulo{color:${esc(cor)};font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;margin:16px 0 10px}
      .caixa{border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin-bottom:10px}
      .caixa label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:3px}
      .caixa .valor{font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:.04em;color:#111}
      .aviso{font-size:10px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;margin-top:12px}
      .rodape{text-align:center;font-size:8px;color:#aaa;margin-top:24px}
    </style></head>
    <body>
      <div class="header">
        ${escola?.logo ? `<img src="${esc(escola.logo)}" />` : ''}
        <div><h1 style="color:${esc(cor)}">${esc(escola?.nome || 'Escola')}</h1><p>${esc(escola?.localizacao || '')}</p></div>
      </div>
      <p class="titulo">Credenciais de Acesso ao Portal do Estudante</p>
      <p><b>${esc(nome)}</b></p>
      ${numero_matricula ? `<p>Nº de matrícula: ${esc(numero_matricula)}</p>` : ''}
      <div class="caixa"><label>Código de Acesso</label><div class="valor">${esc(codigo)}</div></div>
      <div class="caixa"><label>Senha Padrão (data de nascimento DDMMAAAA)</label><div class="valor">${esc(senha)}</div></div>
      <p class="aviso">Guarde este documento em local seguro. Deverá alterar a senha no primeiro acesso ao portal.
        Se a senha já tiver sido alterada e for esquecida, a secretaria/direcção repõe esta mesma senha padrão.</p>
      <p class="rodape">Documento gerado pelo SIGE - SISTEMA INTEGRADO DE GESTÃO ESCOLAR ERP · ${new Date().toLocaleString('pt-MZ')}</p>
    </body></html>
  `)
  win.document.close()
  win.print()
}

// Janela "Dados de Acesso": mostra o código e a senha padrão de um aluno a
// qualquer momento (não só logo após o registo). A senha padrão é sempre a
// mesma que a reposição de senha devolve, por isso está sempre correcta.
export default function DadosAcessoAluno({ alunoId, escola, onClose }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    let vivo = true
    setDados(null); setErro('')
    api.get(`/secretaria/alunos/${alunoId}/acesso`)
      .then(r => { if (vivo) setDados(r.data) })
      .catch(e => { if (vivo) setErro(e.message || 'Não foi possível obter os dados de acesso') })
    return () => { vivo = false }
  }, [alunoId])

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const copiar = async (texto, campo) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(campo); setTimeout(() => setCopiado(''), 1500) } catch {}
  }

  const Linha = ({ label, valor, icon, campo }) => (
    <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-outline-variant">
      <div className="min-w-0">
        <p className="text-xs text-on-surface-variant mb-0.5">{label}</p>
        <p className="font-mono font-bold text-primary text-lg sm:text-xl tracking-widest break-all">{valor}</p>
      </div>
      <button type="button" onClick={() => copiar(valor, campo)} title="Copiar"
        className="flex-shrink-0 p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[20px]">{copiado === campo ? 'check' : icon}</span>
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="dados-acesso-titulo"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 id="dados-acesso-titulo" className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">key</span>Dados de Acesso
            </h2>
            {dados && <p className="text-sm text-on-surface-variant truncate">{dados.nome}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {erro ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        ) : !dados ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : (
          <>
            <div className="bg-primary/5 rounded-xl border border-primary/15 p-4 space-y-3">
              <Linha label="Código de Acesso" valor={dados.codigo} icon="content_copy" campo="codigo" />
              <Linha label="Senha Padrão (data de nascimento)" valor={dados.senha_padrao} icon="content_copy" campo="senha" />
            </div>

            {dados.senha_padrao_em_uso ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-3 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[15px] mt-px">check_circle</span>
                O aluno ainda não alterou a senha — esta senha padrão está activa.
              </p>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[15px] mt-px">info</span>
                O aluno já alterou a senha. Esta senha padrão volta a valer depois de a direcção repor a senha (Utilizadores → Repor senha).
              </p>
            )}

            <button type="button"
              onClick={() => imprimirCredenciaisAluno({ escola, nome: dados.nome, codigo: dados.codigo, senha: dados.senha_padrao, numero_matricula: dados.numero_matricula })}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[18px]">print</span>Imprimir / Baixar PDF
            </button>
          </>
        )}
      </div>
    </div>
  )
}
