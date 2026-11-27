// Cabeçalho de coluna clicável para ordenar (usa useOrdenacao).
// <ThOrdenavel ord={ord} chave="valor" align="right" className="...">Valor</ThOrdenavel>
export function ThOrdenavel({ ord, chave, children, align = 'left', className = '' }) {
  const activo = ord.chave === chave
  const icone = !activo ? 'unfold_more' : ord.direcao === 'asc' ? 'arrow_upward' : 'arrow_downward'
  const just = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
  return (
    <th aria-sort={activo ? (ord.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`${className} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
      <button type="button" onClick={() => ord.ordenarPor(chave)}
        title="Clique para ordenar por esta coluna (clique de novo para inverter)"
        className={`inline-flex items-center gap-1 ${just} w-full uppercase hover:text-primary transition-colors ${activo ? 'text-primary' : ''}`}>
        <span>{children}</span>
        <span className={`material-symbols-outlined text-[14px] leading-none ${activo ? '' : 'opacity-40'}`}>{icone}</span>
      </button>
    </th>
  )
}

// Selector de ordenação para listas em cartões (sem cabeçalho de tabela).
// opcoes = [{ chave: 'data', direcao: 'desc', label: 'Mais recentes' }, ...]
export function SelectOrdenacao({ ord, opcoes, className = '' }) {
  const actual = `${ord.chave}:${ord.direcao}`
  return (
    <label className={`inline-flex items-center gap-2 text-xs text-on-surface-variant ${className}`}>
      <span className="material-symbols-outlined text-[16px]">sort</span>
      <span className="hidden sm:inline">Ordenar:</span>
      <select value={actual} onChange={e => { const [c, d] = e.target.value.split(':'); ord.ordenarPor(c, d) }}
        className="rounded-lg border border-outline-variant px-2 py-1.5 text-xs outline-none focus:border-primary bg-white text-on-surface">
        {opcoes.map(o => <option key={`${o.chave}:${o.direcao}`} value={`${o.chave}:${o.direcao}`}>{o.label}</option>)}
      </select>
    </label>
  )
}

// Opções de ordenação para listas de pagamentos em cartões (useOrdenacao com
// as chaves data, valor, mes, tipo e, opcionalmente, aluno).
export const OPCOES_ORDEM_PAGAMENTOS = [
  { chave: 'data', direcao: 'desc', label: 'Data — mais recentes' },
  { chave: 'data', direcao: 'asc', label: 'Data — mais antigos' },
  { chave: 'valor', direcao: 'desc', label: 'Valor — maior' },
  { chave: 'valor', direcao: 'asc', label: 'Valor — menor' },
  { chave: 'mes', direcao: 'desc', label: 'Mês de referência' },
  { chave: 'tipo', direcao: 'asc', label: 'Tipo (A–Z)' },
]
