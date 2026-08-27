// Traduz erros crus do driver Postgres (identificados pelo SQLSTATE em
// err.code) para mensagens claras em português — nunca deve chegar ao
// utilizador texto tecnico tipo 'duplicate key value violates unique
// constraint "utilizadores_email_key"'.
//
// Aplicado uma unica vez no error handler global (app.js): nenhum modulo
// individual precisa de tratar isto. Erros lançados deliberadamente pelos
// serviços (`new Error('Aluno já tem matrícula activa...')`) não têm
// err.code, por isso nunca passam por aqui — a sua mensagem já é a
// mensagem final, tal como sempre foi.

const NOME_TABELA_PT = {
  utilizadores: 'utilizador', alunos: 'aluno', escolas: 'escola',
  aluno_matriculas: 'matrícula', class_groups: 'turma', grade_levels: 'classe',
  subjects: 'disciplina', taxas: 'tipo de cobrança', cobrancas: 'cobrança',
  pagamentos: 'pagamento', funcionarios: 'funcionário', notas: 'nota',
  periodos_lectivos: 'período lectivo', lancamentos_notas: 'lançamento de notas',
  teaching_assignments: 'atribuição de docência', planos_propinas: 'plano de mensalidades',
  salas: 'sala', bolsas: 'bolsa', contratos: 'contrato', salarios: 'salário',
  aluno_documentos: 'documento', solicitacoes: 'solicitação', conselhos: 'conselho de classe',
}

const nomeTabela = (tabela) => NOME_TABELA_PT[tabela] || tabela || 'registo'

// O driver `pg` já devolve os erros com campos estruturados (table, column,
// constraint, detail), parseados a partir da resposta do Postgres — mais
// fiável do que regex sobre a mensagem principal (err.message).
// err.detail para unique_violation: 'Key (email)=(x@x.com) already exists.'
// err.detail para foreign_key_violation: 'Key (aluno_id)=(999) is not
// present in table "alunos".'
const extrairCampoDoDetail = (detail) => (/Key \((\w+)\)/.exec(detail || '') || [])[1] || null
const extrairTabelaReferenciada = (detail) => (/is not present in table "(\w+)"/i.exec(detail || '') || [])[1] || null

const traduzirErroPostgres = (err) => {
  if (!err || !err.code) return null
  const tabela = nomeTabela(err.table)
  const campo = err.column || extrairCampoDoDetail(err.detail)

  switch (err.code) {
    case '23505': // unique_violation
      return `Já existe um registo de ${tabela} com este valor${campo ? ` (${campo})` : ''} — verifique se não está duplicado.`
    case '23503': { // foreign_key_violation
      const tabelaRef = extrairTabelaReferenciada(err.detail)
      if (tabelaRef) return `O ${nomeTabela(tabelaRef)} indicado não existe (ou já foi removido) — verifique a selecção.`
      return `Não é possível concluir esta operação: o ${tabela} está relacionado com outro registo que ainda existe.`
    }
    case '23502': // not_null_violation
      return `Falta preencher um campo obrigatório${campo ? ` (${campo})` : ''} para gravar este ${tabela}.`
    case '22P02': // invalid_text_representation
      return 'Um dos valores enviados tem um formato inválido — verifique os campos preenchidos.'
    case '23514': // check_violation
      return `O valor indicado não é permitido para este ${tabela}.`
    default:
      return null // codigo desconhecido -- o chamador aplica um fallback generico seguro
  }
}

module.exports = { traduzirErroPostgres }
