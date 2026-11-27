import { useMemo, useState } from 'react'

// Ordenação de listas no cliente, reutilizável em qualquer tabela.
//
//   const ord = useOrdenacao(itens, {
//     data:  { valor: p => p.data_pagamento, tipo: 'data' },
//     valor: { valor: p => p.valor, tipo: 'numero' },
//     aluno: { valor: p => p.aluno_nome },              // tipo 'texto' por omissão
//   }, { chave: 'data', direcao: 'desc' })
//   ord.ordenados -> lista ordenada; ord.ordenarPor('valor'); <ThOrdenavel ord={ord} chave="valor">
//
// Regras: vazios ficam sempre no fim (nunca no topo, em nenhum sentido);
// empates mantêm a ordem em que vieram do servidor (ordenação estável, e o
// servidor já manda por data do pagamento, mais recente primeiro); ao
// escolher uma coluna nova, datas e números começam do maior/mais recente
// e textos de A a Z; clicar de novo na mesma coluna inverte o sentido.

const vazio = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))

const normalizar = (v, tipo) => {
  if (vazio(v)) return null
  if (tipo === 'numero') { const n = Number(v); return Number.isNaN(n) ? null : n }
  if (tipo === 'data') {
    // 'YYYY-MM' (mês de referência) e 'YYYY-MM-DD' comparam bem como texto ISO;
    // Date/ISO com hora convertem-se para o instante.
    if (typeof v === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(v)) return v
    const t = new Date(v).getTime()
    return Number.isNaN(t) ? null : new Date(t).toISOString()
  }
  return String(v)
}

const comparar = (a, b, tipo) => {
  if (tipo === 'numero') return a - b
  if (tipo === 'data') return a < b ? -1 : a > b ? 1 : 0
  return a.localeCompare(b, 'pt', { sensitivity: 'base', numeric: true })
}

// Função pura (testável sem React): col = { valor, tipo }, direcao 'asc'|'desc'
export function ordenarLista(itens, col, direcao) {
  const lista = Array.isArray(itens) ? itens : []
  if (!col) return lista
  const tipo = col.tipo || 'texto'
  const sinal = direcao === 'asc' ? 1 : -1
  return lista
    .map((item, i) => ({ item, i, v: normalizar(col.valor(item), tipo) }))
    .sort((x, y) => {
      if (x.v === null && y.v === null) return x.i - y.i
      if (x.v === null) return 1
      if (y.v === null) return -1
      return comparar(x.v, y.v, tipo) * sinal || x.i - y.i
    })
    .map(x => x.item)
}

export function useOrdenacao(itens, colunas, inicial = {}) {
  const [estado, setEstado] = useState({ chave: inicial.chave || null, direcao: inicial.direcao || 'desc' })

  // colunas é um objecto literal novo a cada render; a ordenação depende só
  // dos itens e da coluna/sentido escolhidos.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ordenados = useMemo(() => ordenarLista(itens, estado.chave && colunas[estado.chave], estado.direcao), [itens, estado.chave, estado.direcao])

  const ordenarPor = (chave, direcao) => {
    setEstado(prev => {
      if (direcao) return { chave, direcao }
      if (prev.chave === chave) return { chave, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
      const tipo = colunas[chave]?.tipo || 'texto'
      return { chave, direcao: tipo === 'texto' ? 'asc' : 'desc' }
    })
  }

  return { ordenados, chave: estado.chave, direcao: estado.direcao, ordenarPor, colunas }
}
