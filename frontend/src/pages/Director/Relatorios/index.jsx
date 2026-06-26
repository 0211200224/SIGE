import { useState } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPOS = [
  { key: 'academico', label: 'Académico', icon: 'school', color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Turmas, médias por disciplina, frequência baixa' },
  { key: 'financeiro', label: 'Financeiro', icon: 'payments', color: 'text-yellow-600', bg: 'bg-yellow-50', desc: 'Receita mensal, estados de pagamento, inadimplentes' },
  { key: 'rh', label: 'Recursos Humanos', icon: 'badge', color: 'text-green-600', bg: 'bg-green-50', desc: 'Departamentos, contratos, folha salarial' },
  { key: 'matriculas', label: 'Matrículas', icon: 'how_to_reg', color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Matrículas por turma e período' },
]

function TabelaSimples({ headers, rows, keys }) {
  if (!rows?.length) return <p className="text-sm text-on-surface-variant py-4 text-center">Sem dados</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-variant text-on-surface-variant">
          <tr>{headers.map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface-variant/30">
              {keys.map(k => <td key={k} className="px-3 py-2 text-on-surface">{row[k] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RelatoriosExecutivos() {
  const [tipo, setTipo] = useState(null)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)

  const carregar = async (t) => {
    setTipo(t)
    setDados(null)
    setLoading(true)
    try {
      const r = await api.get(`/diretor/relatorios/${t}`)
      setDados(r)
    } catch {}
    setLoading(false)
  }

  const imprimir = () => window.print()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Relatórios Executivos" subtitle="Relatórios institucionais por área" />

      {/* Seleção de tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {TIPOS.map((t) => (
          <button key={t.key} onClick={() => carregar(t.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${tipo === t.key ? 'border-primary bg-primary/5' : 'border-outline-variant bg-white hover:border-primary/40'}`}>
            <div className={`w-8 h-8 ${t.bg} rounded-lg flex items-center justify-center mb-2`}>
              <span className={`material-symbols-outlined text-[18px] ${t.color}`}>{t.icon}</span>
            </div>
            <h3 className="font-semibold text-on-surface text-sm">{t.label}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Resultado */}
      {loading && <div className="text-center py-8 text-sm text-on-surface-variant">A gerar relatório...</div>}

      {dados && !loading && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">
              Relatório {TIPOS.find(t => t.key === tipo)?.label}
            </h2>
            <button onClick={imprimir}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[16px]">print</span>
              Imprimir / PDF
            </button>
          </div>

          {tipo === 'academico' && (
            <>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[18px]">class</span>
                  Alunos por Turma
                </h3>
                <TabelaSimples headers={['Turma', 'Total Alunos']} rows={dados.turmas} keys={['turma', 'alunos']} />
              </div>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[18px]">grade</span>
                  Médias por Disciplina
                </h3>
                <TabelaSimples headers={['Disciplina', 'Média', 'Total Alunos']} rows={dados.notas} keys={['disciplina', 'media', 'total_alunos']} />
              </div>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">warning</span>
                  Alunos com Frequência Baixa (Top 20)
                </h3>
                <TabelaSimples headers={['Aluno', 'Turma', 'Frequência (%)']} rows={dados.frequencia_baixa} keys={['nome', 'turma', 'frequencia']} />
              </div>
            </>
          )}

          {tipo === 'financeiro' && (
            <>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-600 text-[18px]">trending_up</span>
                  Receita Mensal
                </h3>
                <TabelaSimples headers={['Mês', 'Recebido (MT)', 'Pendente (MT)']} rows={dados.mensal} keys={['mes', 'recebido', 'pendente']} />
              </div>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3">Estado dos Pagamentos</h3>
                <TabelaSimples headers={['Estado', 'Quantidade', 'Total (MT)']} rows={dados.por_estado} keys={['estado', 'qtd', 'total']} />
              </div>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600 text-[18px]">money_off</span>
                  Maiores Inadimplentes (Top 20)
                </h3>
                <TabelaSimples headers={['Aluno', 'Nº Matrícula', 'Dívida (MT)']} rows={dados.inadimplentes} keys={['nome', 'numero_matricula', 'divida']} />
              </div>
            </>
          )}

          {tipo === 'rh' && (
            <>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3">Funcionários por Departamento</h3>
                <TabelaSimples headers={['Departamento', 'Total', 'Folha Salarial (MT)']} rows={dados.departamentos} keys={['departamento', 'total', 'folha_total']} />
              </div>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">schedule</span>
                  Contratos a Vencer
                </h3>
                <TabelaSimples headers={['Funcionário', 'Tipo', 'Início', 'Fim', 'Dias Restantes']} rows={dados.contratos} keys={['nome', 'tipo_contrato', 'data_inicio', 'data_fim', 'dias_restantes']} />
              </div>
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
                <h3 className="font-semibold text-sm text-on-surface mb-3">Folha Salarial (últimos 12 meses)</h3>
                <TabelaSimples headers={['Mês', 'Ano', 'Total Líquido (MT)', 'Funcionários']} rows={dados.folha} keys={['mes', 'ano', 'total_liquido', 'funcionarios']} />
              </div>
            </>
          )}

          {tipo === 'matriculas' && (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
              <h3 className="font-semibold text-sm text-on-surface mb-3">Matrículas por Turma e Período</h3>
              <TabelaSimples headers={['Turma', 'Matrículas', 'Mês']} rows={dados.matriculas} keys={['turma', 'matriculas', 'mes']} />
            </div>
          )}
        </div>
      )}

      {!tipo && !loading && (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] text-outline-variant">analytics</span>
          <p className="text-sm mt-2">Seleccione um tipo de relatório para gerar</p>
        </div>
      )}
    </div>
  )
}
