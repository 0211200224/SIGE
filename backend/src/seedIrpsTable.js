require('dotenv').config()
const db = require('./config/database')

// Tabela oficial de retenção mensal na fonte de IRPS (Moçambique), tal como
// fornecida pela Autoridade Tributária de Moçambique em folheto de Janeiro
// de 2014, com base na Lei n.º 20/2013 de 23 de Setembro (altera a Lei
// n.º 33/2007 — Código do IRPS), aplicável aos rendimentos obtidos a partir
// de 2014, artigo 65.
//
// ATENÇÃO — REGRA FISCAL A VALIDAR: este documento tem data de 2014. Não foi
// confirmado como sendo a tabela vigente na data em que este seed é corrido.
// confirmada_vigente fica a 0 propositadamente — só um humano com acesso à
// legislação/tabela actual da AT deve mudar isto para 1 (ou substituir os
// escalões por uma tabela mais recente, criando um novo código/versão em vez
// de editar esta linha, para preservar o histórico de qual tabela foi usada
// em cada folha já processada).
const escaloes = [
  { limite_inferior: 0,         limite_superior: 20249.99,  isento: true },
  { limite_inferior: 20250.00,  limite_superior: 20749.99,  coeficiente: 0.10, base: { '0': 0.00 },      isento_deps: [1, 2, 3, 4] },
  { limite_inferior: 20750.00,  limite_superior: 20999.99,  coeficiente: 0.10, base: { '0': 50.00,  '1': 0.00 },  isento_deps: [2, 3, 4] },
  { limite_inferior: 21000.00,  limite_superior: 21249.99,  coeficiente: 0.10, base: { '0': 75.00,  '1': 25.00, '2': 0.00 },  isento_deps: [3, 4] },
  { limite_inferior: 21250.00,  limite_superior: 21749.99,  coeficiente: 0.10, base: { '0': 100.00, '1': 50.00, '2': 25.00, '3': 0.00 },  isento_deps: [4] },
  { limite_inferior: 21750.00,  limite_superior: 22249.99,  coeficiente: 0.10, base: { '0': 150.00, '1': 100.00, '2': 75.00, '3': 50.00, '4': 0.00 },  isento_deps: [] },
  { limite_inferior: 22250.00,  limite_superior: 32749.99,  coeficiente: 0.15, base: { '0': 200.00,   '1': 150.00,   '2': 125.00,   '3': 100.00,   '4': 50.00 } },
  { limite_inferior: 32750.00,  limite_superior: 60749.99,  coeficiente: 0.20, base: { '0': 1775.00,  '1': 1725.00,  '2': 1700.00,  '3': 1675.00,  '4': 1625.00 } },
  { limite_inferior: 60750.00,  limite_superior: 144749.99, coeficiente: 0.25, base: { '0': 7375.00,  '1': 7325.00,  '2': 7300.00,  '3': 7275.00,  '4': 7225.00 } },
  { limite_inferior: 144750.00, limite_superior: null,      coeficiente: 0.32, base: { '0': 28375.00, '1': 28325.00, '2': 28300.00, '3': 28275.00, '4': 28225.00 } },
]

const fonte = 'Autoridade Tributária de Moçambique (AT) - folheto "Principais Alterações ao Código do IRPS", Maputo, Janeiro de 2014. ' +
  'Base legal: Lei n.º 20/2013, de 23 de Setembro (altera a Lei n.º 33/2007, de 31 de Dezembro — Código do IRPS), aplicável aos ' +
  'rendimentos obtidos a partir de 2014, tabela de retenção na fonte mensal do artigo 65. ' +
  'ATENÇÃO: documento de 2014 — NÃO confirmado como vigente na data de uso. Confirmar com a AT/contabilista antes de usar em folhas reais.'

async function seedIrpsTable() {
  try {
    const r = await db.query(
      `INSERT INTO irps_tabelas (codigo, pais, tipo_imposto, periodicidade, vigencia_inicio, vigencia_fim, fonte, versao, confirmada_vigente, activa, escaloes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (codigo) DO UPDATE SET escaloes = EXCLUDED.escaloes, fonte = EXCLUDED.fonte
       RETURNING id, codigo`,
      ['IRPS_MZ_2014_LEI20_2013', 'Moçambique', 'IRPS', 'mensal', '2014-01-01', null, fonte, 'v1', 0, 1, JSON.stringify(escaloes)]
    )
    console.log('Tabela IRPS carregada:', r.rows[0])
    process.exit(0)
  } catch (err) {
    console.error('Erro ao carregar tabela IRPS:', err.message)
    process.exit(1)
  }
}

seedIrpsTable()
