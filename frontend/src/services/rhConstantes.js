// Bancos a operar em Moçambique -- lista fechada para que o campo "Banco"
// tenha sempre o nome do banco (antes era texto livre e chegou a ter números
// de conta escritos lá, o que impede separar o ficheiro de pagamento por banco).
export const BANCOS_MZ = [
  'BIM', 'BCI', 'Standard Bank', 'Absa', 'Moza Banco', 'FNB', 'Nedbank', 'Access Bank',
  'Ecobank', 'First Capital Bank', 'UBA', 'Letshego', 'Socremo', 'Banco Mais', 'MyBucks',
]

export const PORTAIS_EQUIPA = [
  { v: 'secretaria', l: 'Secretaria', icon: 'desk' },
  { v: 'professor', l: 'Professor', icon: 'school' },
  { v: 'financeiro', l: 'Financeiro', icon: 'account_balance' },
  { v: 'rh', l: 'Recursos Humanos', icon: 'groups' },
  { v: 'pedagogico', l: 'Pedagógico', icon: 'menu_book' },
]
export const NOME_PORTAL = {
  director: 'Director', secretaria: 'Secretaria', professor: 'Professor', financeiro: 'Financeiro',
  rh: 'Recursos Humanos', pedagogico: 'Pedagógico', aluno: 'Estudante', super_admin: 'Super Admin',
}

// Mesmas regras do backend (rh.service.js): M-Pesa 84/85, E-Mola 86/87,
// 9 algarismos (aceita o indicativo 258 à frente).
const normalizarMovel = (v) => (v || '').replace(/[\s-]/g, '').replace(/^\+?258/, '')
export const validarContaPagamento = ({ metodo_pagamento, banco, conta_bancaria }) => {
  if (metodo_pagamento === 'banco') {
    if (!banco) return 'Seleccione o banco onde o salário é depositado.'
    const conta = (conta_bancaria || '').replace(/[\s-]/g, '')
    if (!conta) return 'O número da conta bancária é obrigatório.'
    if (!/^\d{5,25}$/.test(conta)) return 'Número de conta bancária inválido — use só algarismos.'
    return ''
  }
  const numero = normalizarMovel(conta_bancaria)
  const nome = metodo_pagamento === 'mpesa' ? 'M-Pesa' : 'E-Mola'
  if (!numero) return `O número ${nome} é obrigatório.`
  const ok = metodo_pagamento === 'mpesa' ? /^8[45]\d{7}$/.test(numero) : /^8[67]\d{7}$/.test(numero)
  if (!ok) return `Número ${nome} inválido — 9 algarismos a começar por ${metodo_pagamento === 'mpesa' ? '84 ou 85' : '86 ou 87'}.`
  return ''
}
